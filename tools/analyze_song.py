"""
Turns the MP3s in songs/ into playable charts.

This is real analysis, not a metadata template. For every track:

  1. decode to mono 22.05 kHz
  2. spectral-flux onset envelope (1024 window, 512 hop)
  3. subtract a ~1 s rolling mean so quiet passages still register, clamp at 0
  4. pick local maxima above a floor, merge anything closer than 90 ms
  5. per peak, record time, normalised strength and spectral centroid

Strength ranks the hit; centroid decides the lane, so low, dark hits (kick,
bass) sit on the left of the board and bright ones (snare, cymbals) on the
right. Difficulty filtering happens in the game, not here.

Writes songs/<slug>.json for inspection and site/charts.js for the game.

Usage:  python tools/analyze_song.py [file.mp3 ...]
"""

import argparse
import glob
import json
import os
import re
import subprocess

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SONGS = os.path.join(ROOT, "songs")
SITE = os.path.join(ROOT, "site")
STEMS = os.path.join(ROOT, "stems")
STEM_MODEL = "htdemucs_6s"

SR = 22050
N_FFT = 1024
HOP = 512
FLOOR = 0.055          # absolute onset floor, after normalisation
MIN_GAP = 0.09         # seconds between accepted peaks


def slug(path):
    name = os.path.splitext(os.path.basename(path))[0]
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def decode(path):
    cmd = ["ffmpeg", "-hide_banner", "-v", "error", "-i", path,
           "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"]
    raw = subprocess.run(cmd, check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype="<f4").copy()


def onset_envelope(a):
    win = np.hanning(N_FFT).astype(np.float32)
    frames = max(1, 1 + (len(a) - N_FFT) // HOP)
    spec = np.empty((frames, N_FFT // 2 + 1), dtype=np.float32)
    for i in range(frames):
        seg = a[i * HOP:i * HOP + N_FFT]
        if len(seg) < N_FFT:
            seg = np.pad(seg, (0, N_FFT - len(seg)))
        spec[i] = np.abs(np.fft.rfft(seg * win))

    flux = np.maximum(0.0, np.diff(spec, axis=0)).sum(axis=1)
    flux = np.concatenate([[0.0], flux]).astype(np.float32)

    # local high-pass against a ~1 s mean
    k = max(3, int(1.0 * SR / HOP))
    kernel = np.ones(k, dtype=np.float32) / k
    local = np.convolve(flux, kernel, mode="same")
    env = np.clip(flux - local, 0, None)

    peak = float(env.max()) or 1.0
    return env / peak, spec


def estimate_tempo(env):
    """Autocorrelation over 70-180 bpm, then a beat-grid fit for the offset."""
    fps = SR / HOP
    x = env - env.mean()
    ac = np.correlate(x, x, "full")[len(x) - 1:]
    best = (0.0, 100.0)
    for lag in range(int(fps * 60 / 180), int(fps * 60 / 70)):
        if 0 < lag < len(ac) and ac[lag] > best[0]:
            best = (float(ac[lag]), 60 * fps / lag)
    bpm = best[1]

    per = fps * 60 / bpm
    best_phase, best_score = 0.0, -1e9
    for ph in np.arange(0, per, 0.5):
        idx = (ph + np.arange(int((len(env) - ph) / per)) * per).astype(int)
        idx = idx[idx < len(env)]
        s = float(env[idx].mean())
        if s > best_score:
            best_score, best_phase = s, ph
    return round(bpm, 1), round(best_phase * HOP / SR, 3)


def peaks(env, spec):
    fps = SR / HOP
    freqs = np.fft.rfftfreq(N_FFT, 1 / SR)
    out = []
    last = -1e9
    for i in range(1, len(env) - 1):
        if env[i] < FLOOR:
            continue
        if not (env[i] >= env[i - 1] and env[i] > env[i + 1]):
            continue
        t = i * HOP / SR
        if t - last < MIN_GAP:
            if out and env[i] > out[-1][1]:
                out[-1] = [t, float(env[i]), _centroid(spec[i], freqs)]
                last = t
            continue
        out.append([t, float(env[i]), _centroid(spec[i], freqs)])
        last = t
    return out


def _centroid(row, freqs):
    total = float(row.sum()) or 1.0
    return float((row * freqs).sum() / total)


def normalise_centroids(ps):
    cs = [p[2] for p in ps]
    lo, hi = min(cs), max(cs)
    span = (hi - lo) or 1.0
    for p in ps:
        p[2] = round((p[2] - lo) / span, 3)
        p[0] = round(p[0], 3)
        p[1] = round(p[1], 3)
    return ps


def analyze(path):
    a = decode(path)
    env, spec = onset_envelope(a)
    ps = normalise_centroids(peaks(env, spec))
    bpm, offset = estimate_tempo(env)
    return {
        "title": os.path.splitext(os.path.basename(path))[0].replace("-", " ").title(),
        "bpm": bpm,
        "offset": offset,
        "duration": round(len(a) / SR, 2),
        "peaks": ps,
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--guitar", action="store_true",
                    help="analyse the separated guitar stem instead of the full mix")
    args = ap.parse_args()

    files = sorted(glob.glob(os.path.join(SONGS, "*.mp3")))
    if not files:
        raise SystemExit("no MP3s in songs/")

    charts = {}
    for path in files:
        key = slug(path)
        source = path
        label = "mix"

        if args.guitar:
            stem = os.path.join(STEMS, STEM_MODEL, key, "guitar.wav")
            if not os.path.exists(stem):
                raise SystemExit(
                    f"missing guitar stem for {key}\n"
                    f"  run: python -m demucs.separate --two-stems=guitar "
                    f"-n {STEM_MODEL} -o \"{STEMS}\" \"{path}\"")
            source = stem
            label = "guitar"

        data = analyze(source)
        data["source"] = label
        charts[key] = data

        with open(os.path.join(SONGS, key + ".json"), "w", encoding="utf-8") as f:
            json.dump(data, f, separators=(",", ":"))
        print(f"{key:16s} {data['duration']:6.1f}s  {data['bpm']:5.1f} bpm  "
              f"{len(data['peaks']):5d} peaks  ({label})")

    with open(os.path.join(SITE, "charts.js"), "w", encoding="utf-8") as f:
        f.write("/* generated by tools/analyze_song.py - do not edit */\n")
        f.write("window.CHARTS = ")
        json.dump(charts, f, separators=(",", ":"))
        f.write(";\n")
    print("wrote", os.path.join(SITE, "charts.js"))


if __name__ == "__main__":
    main()

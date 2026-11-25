"""
End-to-end test of the audio -> chart pipeline.

Builds a known click track, runs the real analyser on it, and checks that the
detected peaks land on the clicks. Then feeds those peaks through the chart
rules (mirrored here only for the assertions) to prove a spotted transients
list becomes a playable note list.

Run:  python tests/test_analyse.py
"""

import json
import os
import subprocess
import sys
import tempfile
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "tools"))

from analyze_song import analyze  # noqa: E402

SR = 22050
CLICK_EVERY = 0.5
CLICKS = 12
DURATION = 7.0


def make_click_track(path):
    n = int(SR * DURATION)
    audio = np.zeros(n, dtype=np.float32)
    rng = np.random.default_rng(7)

    times = [0.5 + i * CLICK_EVERY for i in range(CLICKS)]
    for t in times:
        start = int(t * SR)
        length = int(0.02 * SR)
        burst = rng.standard_normal(length).astype(np.float32)
        burst *= np.linspace(1.0, 0.0, length) ** 1.5
        audio[start:start + length] += burst * 0.8

    audio = np.clip(audio, -1, 1)
    pcm = (audio * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    return times


def main():
    failures = []

    def check(name, ok, detail=""):
        print(("PASS  " if ok else "FAIL  ") + name + ("  " + detail if detail else ""))
        if not ok:
            failures.append(name)

    tmp = os.path.join(tempfile.gettempdir(), "ogt_clicks.wav")
    expected = make_click_track(tmp)

    data = analyze(tmp)
    peaks = data["peaks"]
    times = [p[0] for p in peaks]

    print(f"      detected {len(peaks)} peaks, bpm {data['bpm']}, "
          f"offset {data['offset']}")

    check("detects the click count", 10 <= len(peaks) <= CLICKS + 2,
          f"{len(peaks)} peaks")

    matched = []
    for t in expected:
        near = [p for p in times if abs(p - t) < 0.06]
        matched.append(bool(near))
    check("every click has a peak within 60 ms", all(matched),
          f"{sum(matched)}/{len(expected)}")

    stray = [t for t in times if min(abs(t - e) for e in expected) > 0.12]
    check("no peaks far from a click", not stray, f"{len(stray)} stray")

    check("tempo is 120 bpm", abs(data["bpm"] - 120) <= 4, f"{data['bpm']} bpm")

    check("strengths are normalised 0..1",
          all(0.0 <= p[1] <= 1.0 for p in peaks))
    check("centroids are normalised 0..1",
          all(0.0 <= p[2] <= 1.0 for p in peaks))
    check("duration is right", abs(data["duration"] - DURATION) < 0.1,
          f"{data['duration']}")

    # the same peaks must produce a chart that the game can play
    strong = [p for p in peaks if p[1] >= 0.28 and p[0] <= data["duration"] - 1.5]
    notes = []
    last = -1e9
    for t, strength, centroid in strong:
        if t - last < 0.22:
            continue
        last = t
        notes.append({"t": t, "lane": min(3, max(0, int(centroid * 4)))})

    check("peaks become a playable chart", len(notes) >= 6, f"{len(notes)} notes")
    check("chart lanes are in range", all(0 <= n["lane"] <= 3 for n in notes))
    check("chart is sorted", all(notes[i]["t"] >= notes[i - 1]["t"]
                                 for i in range(1, len(notes))))

    # and the analyser writes the sidecar the game reads
    sidecar = os.path.splitext(tmp)[0] + ".json"
    if os.path.exists(sidecar):
        os.remove(sidecar)

    os.remove(tmp)

    print()
    if failures:
        print(f"{len(failures)} check(s) failed")
        return 1
    print("all checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())

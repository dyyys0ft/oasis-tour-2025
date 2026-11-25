"""
Converts the source track into the 16-bit console treatment used on the site.

ffmpeg's own `acrusher` filter is a no-op in the build on this machine (it
returns byte-identical audio), so the crush is done directly in numpy:

  1. decimate 44.1 -> 22.05 kHz by keeping every other sample, with no
     anti-alias filter, so the top octave folds back into the band
  2. quantise to 6 bits a side, which is where the audible grit comes from

That is the two-part sound of a cartridge sample: aliasing plus a coarse
staircase. Encoding a crushed signal to a lossy format smooths the staircase,
so the bitrate is kept high enough (72k at 22.05 kHz) for the distortion
harmonics to survive.

Usage:  python tools/make_audio.py ["path/to/source.mp3"]
"""

import os
import shutil
import subprocess
import sys
import tempfile
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT_DIR = os.path.join(ROOT, "assets")
OUT = os.path.join(OUT_DIR, "theme.mp3")

DEFAULT_SRC = os.path.join(
    os.path.expanduser("~"), "Downloads",
    "OASIS SUPERSONIC (Instrumental Guitar Cover) \U0001F3B8\U0001F1EC\U0001F1E7.mp3",
)

END = 200.9        # trim the 0.67 s of digital silence so the loop is tight
SR = 22050         # cartridge sample rate
BITS = 6           # quantisation depth


def decode(path):
    # ffmpeg's resampler is properly band-limited, so the only damage is the
    # quantisation below. Decimating without it folded the whole 11-22 kHz
    # octave back into the band and buried the music.
    cmd = [
        "ffmpeg", "-hide_banner", "-v", "error",
        "-t", str(END), "-i", path,
        "-f", "f32le", "-ac", "2", "-ar", str(SR), "-",
    ]
    raw = subprocess.run(cmd, check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype="<f4").reshape(-1, 2)


def crush(a):
    step = 1.0 / (2 ** (BITS - 1))
    return np.clip(np.round(a / step) * step, -1.0, 1.0)


def write_wav(path, a, sr):
    pcm = (a * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC
    if not os.path.exists(src):
        sys.exit(f"source not found: {src}")

    os.makedirs(OUT_DIR, exist_ok=True)

    # The source name contains emoji; work from an ASCII copy.
    tmp = os.path.join(tempfile.gettempdir(), "oasis_source.mp3")
    shutil.copyfile(src, tmp)

    audio = crush(decode(tmp))

    wav = os.path.join(tempfile.gettempdir(), "oasis_crushed.wav")
    write_wav(wav, audio, SR)

    cmd = [
        "ffmpeg", "-hide_banner", "-y", "-v", "error",
        "-i", wav,
        "-af", "lowpass=f=9000,alimiter=limit=0.95",
        "-ar", str(SR), "-ac", "2",
        "-c:a", "libmp3lame", "-b:a", "72k",
        OUT,
    ]
    subprocess.run(cmd, check=True)

    os.remove(tmp)
    os.remove(wav)

    mb = os.path.getsize(OUT) / (1024 * 1024)
    print(f"wrote {OUT}  ({mb:.2f} MB, {BITS}-bit, {SR} Hz)")


if __name__ == "__main__":
    main()

"""
Draws the OasisGuitarTour lockup and the player name plates as 1x pixel art.

Everything is composed at sprite resolution - outline, extrusion, gradient
bands - and exported small so the browser can upscale it by an integer factor
with `image-rendering: pixelated`. Designing at 1x is what keeps the outline
exactly one pixel and the bevel exactly one step.

Usage:  python tools/make_title.py
"""

import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ART = os.path.join(ROOT, "art")
os.makedirs(ART, exist_ok=True)

# 5 x 7 arcade glyphs.
GLYPHS = {
    "A": [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    "E": ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
    "G": [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".###."],
    "I": ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
    "L": ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
    "M": ["#...#", "##.##", "#.#.#", "#...#", "#...#", "#...#", "#...#"],
    "N": ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
    "O": [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    "R": ["####.", "#...#", "#...#", "####.", "#..#.", "#...#", "#...#"],
    "S": [".###.", "#...#", "#....", ".###.", "....#", "#...#", ".###."],
    "T": ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
    "U": ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    "0": [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
    "5": ["#####", "#....", "#....", "####.", "....#", "#...#", ".###."],
    " ": ["...", "...", "...", "...", "...", "...", "..."],
}

# Monochrome, like the Live '25 poster: white type, hard black keyline, grey
# extrusion. No hue at all - the sprites are the only colour on the site.
BAND_TOP = (0xFF, 0xFF, 0xFF)
BAND_MID = (0xDE, 0xDE, 0xDC)
BAND_LOW = (0x9A, 0x9A, 0x98)
HILITE = (0xFF, 0xFF, 0xFF)
EXTRUDE = [(0x5A, 0x5A, 0x5A), (0x33, 0x33, 0x33), (0x16, 0x16, 0x16)]
INK = (0x00, 0x00, 0x00)

PAD = 2


def line_mask(text, scale, tracking):
    w = sum((5 if ch != " " else 3) * scale + tracking for ch in text) - tracking
    h = 7 * scale
    px = set()
    x = 0
    for ch in text:
        rows = GLYPHS[ch]
        gw = len(rows[0])
        for gy, row in enumerate(rows):
            for gx, c in enumerate(row):
                if c != "#":
                    continue
                for sy in range(scale):
                    for sx in range(scale):
                        px.add((x + gx * scale + sx, gy * scale + sy))
        x += gw * scale + tracking
    return px, w, h


def dilate(px):
    out = set()
    for x, y in px:
        out.update({(x, y), (x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)})
    return out


def compose(lines, gap=5):
    """lines: (text, glyph scale, tracking, extrusion depth)"""
    masks = [line_mask(t, s, k) for t, s, k, _ in lines]
    width = max(w for _, w, _ in masks)
    height = sum(h for _, _, h in masks) + gap * (len(masks) - 1)

    oy = PAD
    placed = []
    for (px, w, h), _ in zip(masks, lines):
        x = PAD + (width - w) // 2
        placed.append({(x + dx, oy + dy) for dx, dy in px})
        oy += h + gap

    solids = []
    for face, (_, _, _, depth) in zip(placed, lines):
        solids.append(face | {(x + d, y + d)
                              for d in range(1, depth + 1) for x, y in face})
    union = set().union(*solids)

    depth_max = max(d for _, _, _, d in lines)
    img = Image.new("RGBA", (width + PAD * 2 + depth_max + 1,
                             height + PAD * 2 + depth_max + 1), (0, 0, 0, 0))
    p = img.load()

    def put(x, y, c):
        if 0 <= x < img.width and 0 <= y < img.height:
            p[x, y] = (*c, 255)

    for x, y in dilate(union):
        put(x, y, INK)

    for face, (_, scale, _, depth) in zip(placed, lines):
        for d in range(depth, 0, -1):
            c = EXTRUDE[min(len(EXTRUDE) - 1, depth - d)]
            for x, y in face:
                put(x + d, y + d, c)

        top = min(y for _, y in face)
        bottom = max(y for _, y in face)
        span = max(1, bottom - top)
        for x, y in face:
            t = (y - top) / span
            put(x, y, BAND_TOP if t < 0.34 else (BAND_MID if t < 0.74 else BAND_LOW))

        if scale < 2:
            continue
        for x, y in face:
            if (x, y - 1) not in union:
                put(x, y, HILITE)

    return img


def save(img, name, preview_scale=10):
    img.save(os.path.join(ART, name))
    img.resize((img.width * preview_scale, img.height * preview_scale),
               Image.NEAREST).save(
        os.path.join(ART, "preview_" + name))


def main():
    logo = compose([
        ("2025", 3, 4, 3),
        ("OASIS", 3, 5, 3),
        ("GUITAR TOUR", 1, 4, 1),
    ], gap=4)
    save(logo, "title.png")
    print("wrote title.png", logo.size)

    for who in ("NOEL", "LIAM"):
        plate = compose([(who, 2, 2, 2)], gap=0)
        save(plate, f"name_{who.lower()}.png")
        print(f"wrote name_{who.lower()}.png", plate.size)


if __name__ == "__main__":
    main()

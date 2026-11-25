"""
OasisGuitarTour - 16-bit sprite compiler.

Noel  : navy bomber, big shades, yellow Epiphone-style semi-hollow.
Liam  : 3/4 olive parka, big shades, monobrow, maraca.

Authoring model
---------------
Characters are dicts:  y -> [(x, "row-of-symbols"), ...]
Instruments are drawn procedurally onto a Grid, outlined, then composited.

Layout (64x64, feet at y56):
    head   y1  .. y18
    neck   y19
    coat   y20 .. y36 (Noel bomber) / y42 (Liam 3/4 parka)
    legs   .. y53
    shoes  y54 .. y56
"""

import json
import os

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ART = os.path.join(ROOT, "art")
os.makedirs(ART, exist_ok=True)

W = H = 64

# ---------------------------------------------------------------- palette ---
# 16 entries, index 0 transparent. 15-bit values.
PAL = {
    '.': None,
    '#': (0x0A, 0x0A, 0x0D),   # outline
    's': (0xE8, 0xB9, 0x8A),   # skin
    'd': (0xB8, 0x81, 0x4F),   # skin shadow
    'w': (0xD8, 0xD8, 0xD6),   # white: tee, teeth, trainers, chrome, strings
    'h': (0x2A, 0x1E, 0x15),   # hair dark
    'H': (0x4A, 0x36, 0x25),   # hair mid: highlight, brow, stubble, wood
    'n': (0x1E, 0x24, 0x30),   # navy bomber
    'N': (0x12, 0x16, 0x1F),   # navy shadow, lens, hardware
    'm': (0x4A, 0x5A, 0x78),   # navy light, lens reflection
    'r': (0x4E, 0x5B, 0x34),   # parka green
    'R': (0x36, 0x40, 0x2A),   # parka shadow
    'q': (0x6E, 0x7C, 0x4A),   # parka light
    'y': (0xE8, 0xC4, 0x3C),   # guitar yellow / gold chain
    'Y': (0xB0, 0x8A, 0x12),   # guitar shadow
    't': (0x22, 0x24, 0x2A),   # trousers, dark top, sole
}


# ------------------------------------------------------------------ grid ---
class Grid:
    def __init__(self):
        self.g = [['.'] * W for _ in range(H)]

    def px(self, x, y, ch):
        if 0 <= x < W and 0 <= y < H:
            self.g[y][x] = ch

    def get(self, x, y):
        if 0 <= x < W and 0 <= y < H:
            return self.g[y][x]
        return '.'

    def overlay(self, other):
        for y in range(H):
            for x in range(W):
                c = other.g[y][x]
                if c != '.':
                    self.g[y][x] = c

    def outline(self, ch='#'):
        src = [row[:] for row in self.g]
        for y in range(H):
            for x in range(W):
                if src[y][x] == '.':
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if not (0 <= nx < W and 0 <= ny < H) or src[ny][nx] == '.':
                        self.g[y][x] = ch
                        break

    def to_segments(self):
        out = {}
        for y in range(H):
            x = 0
            while x < W:
                if self.g[y][x] != '.':
                    s = x
                    while x < W and self.g[y][x] != '.':
                        x += 1
                    out.setdefault(y, []).append((s, ''.join(self.g[y][s:x])))
                else:
                    x += 1
        return out

    def bbox(self):
        xs, ys = [], []
        for y in range(H):
            for x in range(W):
                if self.g[y][x] != '.':
                    xs.append(x)
                    ys.append(y)
        if not xs:
            return None
        return min(xs), min(ys), max(xs), max(ys)

    def shifted(self, dx, dy):
        out = Grid()
        for y in range(H):
            for x in range(W):
                if self.g[y][x] != '.':
                    out.px(x + dx, y + dy, self.g[y][x])
        return out


def sprite_to_grid(sprite):
    g = Grid()
    for y, segs in sprite.items():
        for x, row in segs:
            for i, ch in enumerate(row):
                g.px(x + i, y, ch)
    return g


# ------------------------------------------------------------- rendering ---
def render(sprite):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    px = img.load()
    for y, segs in sprite.items():
        if not 0 <= y < H:
            raise ValueError(f"row y={y} outside canvas")
        for x, row in segs:
            for i, ch in enumerate(row):
                if ch not in PAL:
                    raise ValueError(f"unknown symbol {ch!r} at y={y} x={x + i}")
                if not 0 <= x + i < W:
                    raise ValueError(f"pixel outside canvas at y={y} x={x + i}")
                c = PAL[ch]
                if c:
                    px[x + i, y] = (*c, 255)
    return img


def upscale(img, n):
    return img.resize((img.width * n, img.height * n), Image.NEAREST)


def shift(sprite, dy):
    return {y + dy: segs for y, segs in sprite.items() if y + dy < H}


def keyed(img, rgb=(255, 0, 255)):
    bg = Image.new("RGBA", img.size, (*rgb, 255))
    bg.alpha_composite(img)
    return bg


def save(img, name, n=12):
    img.save(os.path.join(ART, name))
    upscale(img, n).save(os.path.join(ART, f"preview_{name}"))


# ---------------------------------------------------------------- heads ---
def head_noel():
    return {
        1:  [(28, "########")],
        2:  [(26, "#hhhhhhhhhh#")],
        3:  [(25, "#hhhhhhhhhhhh#")],
        4:  [(24, "#hhhhhhhhhhhhhh#")],
        5:  [(23, "#hhhHhhhhhhhhhhh#")],
        6:  [(23, "#hhhhhhhhhhhhhhhh#")],
        7:  [(23, "#hh" + "sshhsssshhss" + "hh#")],
        8:  [(23, "#hh" + "s" * 12 + "hh#")],
        9:  [(23, "#hh" + "#####ss#####" + "hh#")],
        10: [(23, "#hh" + "#wNN#ss#NNw#" + "hh#")],
        11: [(23, "#hh" + "#mNN#ss#NNm#" + "hh#")],
        12: [(23, "#hh" + "#####ss#####" + "hh#")],
        13: [(23, "#hh" + "ssssssddssss" + "hh#")],
        14: [(23, "#hh" + "sssddddddsss" + "hh#")],
        15: [(23, "#hh" + "sHHssssssHHs" + "hh#")],
        16: [(23, "#hh" + "sHHssHHssHHs" + "hh#")],
        17: [(24, "#hh" + "s" * 10 + "hh#")],
        18: [(26, "#h" + "s" * 8 + "h#")],
        19: [(30, "#ss#")],
    }


def head_liam():
    return {
        1:  [(28, "########")],
        2:  [(26, "#hhhhhhhhhh#")],
        3:  [(25, "#hhhhhhhhhhhh#")],
        4:  [(24, "#hhhhhhhhhhhhhh#")],
        5:  [(23, "#hhhhHhhhhhhhhhh#")],
        6:  [(23, "#hhhhhhhhhhhhhhhh#")],
        7:  [(23, "#hhhhhhhhhhhhhhhh#")],
        8:  [(23, "#hh" + "s" * 12 + "hh#")],
        9:  [(23, "#hh" + "ssHHHHHHHHss" + "hh#")],
        10: [(23, "#hh" + "#####ss#####" + "hh#")],
        11: [(23, "#hh" + "#wNN#ss#NNw#" + "hh#")],
        12: [(23, "#hh" + "#mNN#ss#NNm#" + "hh#")],
        13: [(23, "#hh" + "#####ss#####" + "hh#")],
        14: [(23, "#hh" + "ssssssddssss" + "hh#")],
        15: [(23, "#hh" + "ssdwwwwwwdss" + "hh#")],
        16: [(23, "#hh" + "ssddddddddss" + "hh#")],
        17: [(24, "#hh" + "s" * 10 + "hh#")],
        18: [(26, "#h" + "s" * 8 + "h#")],
        19: [(30, "#ss#")],
    }


# ----------------------------------------------------------------- coats ---
def coat_noel():
    n, N, m = "n", "N", "m"
    rows = {
        20: [(25, "#" + N * 12 + "#")],
        21: [(23, "#" + n * 16 + "#")],
        22: [(20, "#" + n * 22 + "#")],
        23: [(19, "#" + n * 24 + "#")],
    }

    def body(tee):
        pad = (14 - tee) // 2
        mid = n * (pad - 1) + N + "w" * tee + N + n * (pad - 1)
        return [(19, "#" + m + n * 3 + N + mid + N + n * 3 + m + "#")]

    rows[24] = body(2)
    rows[25] = body(4)
    rows[26] = body(6)
    for y in range(27, 35):
        rows[y] = body(8)
    rows[35] = [(19, "#" + n * 24 + "#")]
    rows[36] = [(19, "#" + N * 24 + "#")]
    return rows


def coat_liam():
    """3/4 olive parka: falls to mid-thigh (y42) and flares at the hem."""
    r, R, q, t = "r", "R", "q", "t"
    rows = {
        20: [(25, "#" + t * 12 + "#")],
        21: [(23, "#" + t * 4 + r * 8 + t * 4 + "#")],
        22: [(20, "#" + t * 2 + r * 20 + t * 2 + "#")],
        23: [(19, "#" + r * 24 + "#")],
    }

    def body(w, button=False):
        mid_w = (w - 2) - 10
        placket = "tt" if button else "RR"
        pad = (mid_w - 2) // 2
        mid = r * pad + placket + r * pad
        return [(32 - w // 2, "#" + q + r * 3 + R + mid + R + r * 3 + q + "#")]

    for y in range(24, 36):
        rows[y] = body(26, button=(y - 24) % 4 == 0)
    for y in range(36, 41):
        rows[y] = body(28, button=(y - 24) % 4 == 0)
    rows[41] = [(18, "#" + q * 26 + "#")]
    rows[42] = [(18, "#" + R * 26 + "#")]
    return rows


def legs(coat_end):
    r = {}
    for y in range(coat_end + 1, 54):
        r[y] = [(24, "#tttttN#"), (32, "#Nttttt#")]
    r[54] = [(24, "#wwwwww#"), (32, "#wwwwww#")]
    r[55] = [(22, "#wwwwwwww#"), (32, "#wwwwwwww#")]
    r[56] = [(21, "#ttttttttt#"), (32, "#ttttttttt#")]
    return r


# --------------------------------------------------------------- walking ---
# The characters face the viewer, so a walk cannot read as a stride in profile.
# It reads through three things: a two-beat vertical bob, a lateral sway of the
# upper body, and feet that lift and plant alternately.
#
# Six frames, two steps.  Phase A (f0-f2) has the left foot planted; phase B
# (f3-f5) has the right foot planted.  Per frame: (left_x, left_lift,
# right_x, right_lift).
NOEL_LEGS = [
    (23, 0, 32, 1),   # left heel strike, right toe-off
    (24, 0, 33, 3),   # left stance, right passing at its highest
    (24, 0, 32, 1),   # left stance peak, right reaching down
    (24, 1, 33, 0),   # right heel strike, left toe-off
    (25, 3, 32, 0),   # right stance, left passing at its highest
    (24, 1, 32, 0),   # right stance peak, left reaching down
]

# Liam swaggers: deeper dip at contact, harder pop at the peak, shoulders
# rolling two pixels each way, and the maraca arm swinging out from the body.
LIAM_LEGS = [
    (22, 0, 32, 2),
    (24, 0, 34, 4),
    (24, 0, 32, 1),
    (24, 2, 33, 0),
    (26, 4, 32, 0),
    (24, 1, 32, 0),
]

NOEL_BOB = [1, 0, -1, 1, 0, -1]
NOEL_SWAY = [-1, -1, -1, 1, 1, 1]

# The instrument hangs from the fretting hand, so it rotates about it: the
# neck stays put and the body end swings. `tilt` is an extra shear about
# GUITAR_PIVOT, `dx` a small drift against the torso sway.
NOEL_ARM = [
    (0, 0.09),
    (-1, 0.03),
    (-1, -0.045),
    (0, -0.09),
    (1, -0.03),
    (1, 0.045),
]

LIAM_BOB = [2, 0, -2, 2, 0, -2]
LIAM_SWAY = [-2, -2, -1, 2, 2, 1]
LIAM_ARM = [0, -1, -1, 0, 1, 1]       # maraca drifts wider than the body

# instrument cycles -------------------------------------------------------
NOEL_STRUM = [0, 2, 2, 1]             # hand down the strings, then back
NOEL_STRUM_TILT = [0.0, 0.015, 0.025, 0.01]
LIAM_SHAKE = [0.24, 0.0, -0.24, 0.0]  # bulb lurches left, right, left

LEG_TOP = 28          # well above either hem, so the coat can slide over it


def move(sprite, dx=0, dy=0):
    out = {}
    for y, segs in sprite.items():
        ny = y + dy
        if 0 <= ny < H:
            out[ny] = [(x + dx, row) for x, row in segs]
    return out


def one_leg(x, top, lift, side):
    """A trouser column plus its shoe, raised by `lift` pixels.

    The shoe narrows as it lifts: a planted foot is 9 px wide, a foot at the
    top of its swing only 7, which reads as the toe rolling away from us.
    """
    trouser = "#tttttN#" if side == "L" else "#Nttttt#"
    out = {}
    bottom = 56 - lift
    for y in range(top, bottom - 2):
        out.setdefault(y, []).append((x, trouser))

    o = min(lift, 2)
    top_w, mid_w = 8 - o, 9 - o
    out.setdefault(bottom - 2, []).append(
        (x - 2 + o if side == "L" else x, "#" + "w" * (top_w - 2) + "#"))
    out.setdefault(bottom - 1, []).append(
        (x - 3 + o if side == "L" else x, "#" + "w" * (mid_w - 2) + "#"))
    out.setdefault(bottom, []).append(
        (x - 3 + o if side == "L" else x, "#" + "t" * (mid_w - 2) + "#"))
    return out


def stack_legs(s, lx, ll, rx, rl):
    for part in (one_leg(lx, LEG_TOP, ll, "L"), one_leg(rx, LEG_TOP, rl, "R")):
        for y, segs in part.items():
            s.setdefault(y, []).extend(segs)


def swing_below(sprite, y0, dx):
    """Offset only the rows at/below y0, so a coat hem can lag the body."""
    if not dx:
        return sprite
    out = dict(sprite)
    for y, segs in sprite.items():
        if y >= y0:
            out[y] = [(x + dx, row) for x, row in segs]
    return out


def walk_noel(f):
    lx, ll, rx, rl = NOEL_LEGS[f]
    bob, sway = NOEL_BOB[f], NOEL_SWAY[f]
    adx, tilt = NOEL_ARM[f]

    s = {}
    stack_legs(s, lx, ll, rx, rl)
    s.update(move(head_noel(), sway, bob))
    s.update(move(coat_noel(), sway, bob))

    g = sprite_to_grid(s)
    g.overlay(guitar_grid(tilt, hands=True).shifted(sway + adx, bob))
    return g.to_segments()


def walk_liam(f):
    lx, ll, rx, rl = LIAM_LEGS[f]
    bob, sway = LIAM_BOB[f], LIAM_SWAY[f]
    arm = LIAM_ARM[f]

    s = {}
    stack_legs(s, lx, ll, rx, rl)
    s.update(move(head_liam(), sway, bob))
    # hem trails a pixel behind the shoulders
    s.update(move(swing_below(coat_liam(), 37, -1 if sway > 0 else 1), sway, bob))

    g = sprite_to_grid(s)
    g.overlay(maraca_grid().shifted(sway + arm, bob))
    return g.to_segments()


def strum_noel(f):
    """Noel only: the strumming hand sweeps the strings while the guitar rocks."""
    s = {}
    s.update(head_noel())
    s.update(coat_noel())
    s.update(legs(36))

    g = sprite_to_grid(s)
    g.overlay(guitar_grid(NOEL_STRUM_TILT[f], hands=True, strum=NOEL_STRUM[f]))
    return g.to_segments()


def shake_liam(f):
    """Liam only: the bulb lurches about his fist."""
    s = {}
    s.update(head_liam())
    s.update(coat_liam())
    s.update(legs(42))

    g = sprite_to_grid(s)
    g.overlay(maraca_grid(LIAM_SHAKE[f]))
    return g.to_segments()


# ------------------------------------------------------------ instruments ---
def shear(grid, k, x0=32):
    """Tilt a grid: y' = y + k*(x - x0). Small angles only."""
    out = Grid()
    for y in range(H):
        for x in range(W):
            c = grid.g[y][x]
            if c != '.':
                out.px(x, y + int(round(k * (x - x0))), c)
    return out


def shear_x(grid, m, y0):
    """Swing a grid sideways about a pivot row: x' = x + m*(y0 - y).

    Used instead of a real rotation for the maraca shake: rotating a pixel
    circle by 15 degrees tears its outline, a shear just leans it.
    """
    out = Grid()
    for y in range(H):
        for x in range(W):
            c = grid.g[y][x]
            if c != '.':
                out.px(x + int(round(m * (y0 - y))), y, c)
    return out


# Where the two hands sit on the flat guitar before it is sheared.
GUITAR_HANDS = ((26, 37), (41, 37))
GUITAR_ANGLE = 0.255     # the resting playing tilt
GUITAR_PIVOT = 26        # swing happens about the fretting hand


def guitar_hand_y(hy, hx, tilt):
    """Screen row of a hand anchor, reproducing the two shear passes exactly."""
    y = hy + int(round(GUITAR_ANGLE * (hx - 32)))
    return y + int(round(tilt * (hx - GUITAR_PIVOT)))


def guitar_grid(tilt=0.0, hands=False, strum=0):
    """Yellow semi-hollow drawn flat, then sheared into a playing angle.

    `tilt` is an extra shear about GUITAR_PIVOT, so the swing rotates the
    instrument around the fretting hand: the neck stays put and the body end
    travels. With `hands=True` both hands are painted in after the shear,
    using the same transforms, so they cannot drift off the instrument.
    `strum` slides the strumming hand down the body.
    """
    g = Grid()
    cy = 38

    body = []
    for y in range(H):
        for x in range(W):
            upper = ((x - 36.0) / 4.2) ** 2 + ((y - cy) / 5.2) ** 2 <= 1.0
            lower = ((x - 43.5) / 6.0) ** 2 + ((y - cy) / 6.6) ** 2 <= 1.0
            if upper or lower:
                body.append((x, y))

    coords = set(body)
    for x, y in body:
        edge = any((x + dx, y + dy) not in coords
                   for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        g.px(x, y, 'Y' if edge else 'y')

    # neck (light maple so it separates from the navy bomber)
    for x in range(23, 33):
        for y in range(cy - 2, cy + 3):
            g.px(x, y, 'd')

    # headstock
    for x in range(18, 24):
        for y in range(cy - 3, cy + 4):
            g.px(x, y, 'd')

    # strings
    for x in range(23, 45):
        g.px(x, cy, 'w')

    # fret markers
    for x in (25, 28, 31):
        g.px(x, cy - 1, 'N')

    # humbuckers: small, so they read as hardware not holes
    for x0 in (34, 37):
        for x in (x0, x0 + 1):
            for y in (cy - 1, cy):
                g.px(x, y, 'N')

    # tuning pegs
    for x in (20, 22):
        g.px(x, cy - 3, 'w')
        g.px(x, cy + 3, 'w')

    g = shear(g, GUITAR_ANGLE)
    if tilt:
        g = shear(g, tilt, x0=GUITAR_PIVOT)
    g.outline()
    if hands:
        for i, (hx, hy) in enumerate(GUITAR_HANDS):
            y = guitar_hand_y(hy, hx, tilt)
            # the strumming hand rests on yellow, so shade it rather than
            # ring it in black, which read as a hole in the body
            hand(g, hx, y + (strum if i == 1 else 0),
                 outline='Y' if i == 1 else None)
    return g


def maraca_grid(shake=0.0):
    """Bulb, handle and the gripping fist as one asset, so the hand can never
    drift off the handle when the walk cycle swings the arm.

    `shake` leans the bulb about the fist for the maraca-shake cycle.
    """
    g = Grid()
    cx, cy = 46.0, 29.0

    for y in range(H):
        for x in range(W):
            if ((x - cx) / 4.9) ** 2 + ((y - cy) / 4.4) ** 2 <= 1.0:
                d = (x - cx) + (y - cy)
                g.px(x, y, 'Y' if d > 2.8 else 'y')

    # handle: three pixels wide so the middle survives the outline pass
    for i in range(24):
        t = i / 23
        hx = 45.0 - 1.5 * t
        hy = 32.0 + 5.0 * t
        for dx in (-1, 0, 1):
            g.px(int(round(hx)) + dx, int(round(hy)), 'H')

    if shake:
        g = shear_x(g, shake, 37)
    g.outline()
    hand(g, 41, 35)
    return g


HAND_CELLS = ((1, 0), (0, 1), (1, 1), (2, 1), (0, 2), (1, 2), (2, 2))


def hand(g, x, y, outline=None):
    """A 3x3 fist. `outline` rings it in that symbol wherever it sits on
    another filled surface — skin on guitar yellow has almost no contrast
    without a separating line."""
    cells = [(x + dx, y + dy) for dx, dy in HAND_CELLS]
    cellset = set(cells)
    if outline:
        for cx, cy in cells:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                n = (cx + dx, cy + dy)
                if n not in cellset and g.get(*n) != '.':
                    g.px(n[0], n[1], outline)
    for cx, cy in cells:
        g.px(cx, cy, 's')


# ---------------------------------------------------------------- builds ---
def build_noel(guitar=False):
    s = {}
    s.update(head_noel())
    s.update(coat_noel())
    s.update(legs(36))
    if not guitar:
        return s
    g = sprite_to_grid(s)
    g.overlay(guitar_grid(hands=True))
    return g.to_segments()


def build_liam(maraca=False):
    s = {}
    s.update(head_liam())
    s.update(coat_liam())
    s.update(legs(42))
    if not maraca:
        return s
    g = sprite_to_grid(s)
    g.overlay(maraca_grid())      # the fist is part of the maraca asset
    return g.to_segments()


# ----------------------------------------------------------------- emit ---
def centered(grid):
    box = grid.bbox()
    if not box:
        return grid
    x0, y0, x1, y1 = box
    dx = round(W / 2 - (x0 + x1 + 1) / 2)
    dy = round(H / 2 - (y0 + y1 + 1) / 2)
    return grid.shifted(dx, dy)


def main():
    frames = {
        "noel_idle_0": build_noel(True),
        "noel_idle_1": shift(build_noel(True), 1),
        "liam_idle_0": build_liam(True),
        "liam_idle_1": shift(build_liam(True), 1),
    }

    imgs = {}
    for name, sprite in frames.items():
        img = render(sprite)
        imgs[name] = img
        save(img, f"{name}.png")

    for name in ("noel_idle_0", "liam_idle_0"):
        keyed(imgs[name]).save(os.path.join(ART, f"{name}_magenta.png"))

    # instrument assets
    for name, gr in (("guitar_yellow", guitar_grid()), ("maraca", maraca_grid())):
        save(render(centered(gr).to_segments()), f"{name}.png")

    # palette strip
    strip = Image.new("RGBA", (16 * 24, 30), (0x14, 0x14, 0x1C, 255))
    d = ImageDraw.Draw(strip)
    for i, (_, c) in enumerate(PAL.items()):
        if c:
            d.rectangle([i * 24 + 2, 2, i * 24 + 21, 21], fill=(*c, 255))
    upscale(strip, 3).save(os.path.join(ART, "preview_palette.png"))

    # presentation sheet
    S = 6
    cell = W * S
    pad = 20
    sheet = Image.new("RGBA", (cell * 2 + pad * 3, cell + pad * 2 + 34),
                      (0x14, 0x14, 0x1C, 255))
    d = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.load_default(size=20)
    except Exception:
        font = ImageFont.load_default()
    for i, name in enumerate(("noel_idle_0", "liam_idle_0")):
        x = pad + i * (cell + pad)
        sheet.alpha_composite(upscale(imgs[name], S), (x, pad))
        d.line([(x, pad + cell - 4), (x + cell, pad + cell - 4)],
               fill=(0x3A, 0x3A, 0x46, 255))
        d.text((x + 6, pad + cell + 4), "NOEL" if name.startswith("noel") else "LIAM",
               fill=(0xD8, 0xD8, 0xD0, 255), font=font)
    sheet.save(os.path.join(ART, "sheet_characters.png"))

    # idle atlas
    order = ["noel_idle_0", "noel_idle_1", "liam_idle_0", "liam_idle_1"]
    atlas = Image.new("RGBA", (W * len(order), H), (0, 0, 0, 0))
    for i, name in enumerate(order):
        atlas.alpha_composite(imgs[name], (i * W, 0))
    atlas.save(os.path.join(ART, "atlas_idle.png"))

    meta = {
        "frameWidth": W,
        "frameHeight": H,
        "animations": {
            "noel_idle": {"image": "atlas_idle.png", "row": 0, "frames": [0, 1], "fps": 4},
            "liam_idle": {"image": "atlas_idle.png", "row": 0, "frames": [2, 3], "fps": 4},
        },
    }

    # ---- walk cycle ------------------------------------------------------
    walk = {}
    for f in range(6):
        walk[("noel", f)] = walk_noel(f)
        walk[("liam", f)] = walk_liam(f)

    for (who, f), sprite in walk.items():
        save(render(sprite), f"{who}_walk_{f}.png")

    # walk atlas: Noel row 0, Liam row 1
    watlas = Image.new("RGBA", (W * 6, H * 2), (0, 0, 0, 0))
    for f in range(6):
        watlas.alpha_composite(render(walk[("noel", f)]), (f * W, 0))
        watlas.alpha_composite(render(walk[("liam", f)]), (f * W, H))
    watlas.save(os.path.join(ART, "atlas_walk.png"))

    for who, row in (("noel", 0), ("liam", 1)):
        meta["animations"][f"{who}_walk"] = {
            "image": "atlas_walk.png",
            "row": row,
            "frames": list(range(6)),
            "fps": 8,
        }
    with open(os.path.join(ART, "atlas.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    # ---- walk strip for review -------------------------------------------
    S2 = 4
    c2 = W * S2
    pad2 = 12
    wsheet = Image.new("RGBA", (c2 * 6 + pad2 * 7, c2 * 2 + pad2 * 3 + 30),
                       (0x14, 0x14, 0x1C, 255))
    d = ImageDraw.Draw(wsheet)
    for r, who in enumerate(("noel", "liam")):
        for f in range(6):
            img = render(walk[(who, f)])
            wsheet.alpha_composite(upscale(img, S2),
                                   (pad2 + f * (c2 + pad2), pad2 + r * (c2 + pad2)))
        d.text((pad2, pad2 + r * (c2 + pad2) - 2),
               "NOEL" if who == "noel" else "LIAM",
               fill=(0x7D, 0x7D, 0x92, 255), font=font)
    wsheet.save(os.path.join(ART, "sheet_walk.png"))

    # ---- instrument cycles -----------------------------------------------
    action = {("noel", f): strum_noel(f) for f in range(4)}
    action.update({("liam", f): shake_liam(f) for f in range(4)})

    for (who, f), sprite in action.items():
        label = "strum" if who == "noel" else "shake"
        save(render(sprite), f"{who}_{label}_{f}.png")

    aatlas = Image.new("RGBA", (W * 4, H * 2), (0, 0, 0, 0))
    for f in range(4):
        aatlas.alpha_composite(render(action[("noel", f)]), (f * W, 0))
        aatlas.alpha_composite(render(action[("liam", f)]), (f * W, H))
    aatlas.save(os.path.join(ART, "atlas_action.png"))

    meta["animations"]["noel_strum"] = {
        "image": "atlas_action.png", "row": 0,
        "frames": list(range(4)), "fps": 10,
    }
    meta["animations"]["liam_shake"] = {
        "image": "atlas_action.png", "row": 1,
        "frames": list(range(4)), "fps": 10,
    }
    with open(os.path.join(ART, "atlas.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    # action strip for review
    S3 = 6
    c3 = W * S3
    asheet = Image.new("RGBA", (c3 * 4 + pad2 * 5, c3 * 2 + pad2 * 3 + 30),
                       (0x14, 0x14, 0x1C, 255))
    d = ImageDraw.Draw(asheet)
    for r, who in enumerate(("noel", "liam")):
        label = "strum" if who == "noel" else "shake"
        for f in range(4):
            asheet.alpha_composite(upscale(render(action[(who, f)]), S3),
                                   (pad2 + f * (c3 + pad2), pad2 + r * (c3 + pad2)))
        d.text((pad2, pad2 + r * (c3 + pad2) - 2),
               f"{who.upper()} {label}", fill=(0x7D, 0x7D, 0x92, 255), font=font)
    asheet.save(os.path.join(ART, "sheet_action.png"))

    print("wrote", len(frames), "idle frames, 12 walk, 8 instrument frames, sheets, atlas to", ART)


if __name__ == "__main__":
    main()

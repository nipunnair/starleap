# /// script
# dependencies = ["pillow", "numpy", "opencv-python-headless"]
# ///
"""Slice a Nano Banana avatar preview sheet into individually addressable per-state portrait webp
files. Circles are found automatically via Hough transform (robust to whatever ring color the
sheet uses) and read in reading order (row by row, top-to-bottom, left-to-right within a row).

Regular 3x2 sheets (idle/thinking/found-it / move/celebrate/worried, 6 circles) need no extra
flags. An irregular sheet — a different grid shape, an extra alt take, a duplicate/typo'd caption
— needs --states: one entry per detected circle in reading order, "" or "skip" to drop a circle
(e.g. an unwanted alt take).

Usage:
  uv run scripts/extract-avatar-sheet.py art/avatars/<tier>-sheet.png <tier>
  uv run scripts/extract-avatar-sheet.py art/avatars/<tier>-sheet.png <tier> --dry-run   # preview
  uv run scripts/extract-avatar-sheet.py art/avatars/<tier>-sheet.png <tier> \
      --states idle,thinking,found-it,move,celebrate,,worried   # irregular: drop circle 6
"""
import argparse
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "assets" / "avatars"
DEFAULT_STATES = ["idle", "thinking", "found-it", "move", "celebrate", "worried"]
SIZE = 160  # matches portrait-*.webp on the landing page


def find_circles(gray: np.ndarray) -> list[tuple[int, int, int]]:
    h, w = gray.shape
    blurred = cv2.medianBlur(gray, 5)
    circles = cv2.HoughCircles(
        blurred,
        cv2.HOUGH_GRADIENT,
        dp=1.2,
        minDist=w // 6,
        param1=100,
        param2=40,
        minRadius=w // 14,
        maxRadius=w // 6,
    )
    if circles is None:
        raise SystemExit("No circles detected — check sheet layout / adjust Hough params.")
    pts = [(int(x), int(y), int(r)) for x, y, r in circles[0]]
    # A real avatar ring is fully inside the sheet; Hough often fits a spurious circle to a
    # nebula wisp near the frame edge whose fitted extent runs off-canvas — drop those first.
    pts = [p for p in pts if p[0] - p[2] >= 0 and p[0] + p[2] <= w and p[1] - p[2] >= 0 and p[1] + p[2] <= h]
    if len(pts) > 6:
        # Remaining false positives (in-bounds nebula wisps) tend to sit off the size cluster the
        # real, uniformly-sized avatar rings form — keep the largest tight radius cluster.
        by_r = sorted(pts, key=lambda p: p[2])
        clusters: list[list[tuple[int, int, int]]] = [[by_r[0]]]
        for p in by_r[1:]:
            if p[2] - clusters[-1][-1][2] <= 15:
                clusters[-1].append(p)
            else:
                clusters.append([p])
        pts = max(clusters, key=len)
    return pts


def reading_order(pts: list[tuple[int, int, int]]) -> list[tuple[int, int, int]]:
    """Group into rows by y-proximity (gap > mean radius starts a new row), then sort each row
    left-to-right. Handles any grid shape, including rows of unequal length."""
    by_y = sorted(pts, key=lambda p: p[1])
    mean_r = sum(p[2] for p in pts) / len(pts)
    rows: list[list[tuple[int, int, int]]] = [[by_y[0]]]
    for p in by_y[1:]:
        row_y = sum(q[1] for q in rows[-1]) / len(rows[-1])
        if abs(p[1] - row_y) <= mean_r:
            rows[-1].append(p)
        else:
            rows.append([p])
    ordered = []
    for row in rows:
        ordered.extend(sorted(row, key=lambda p: p[0]))
    return ordered


def feathered_circle_alpha(size: int, inset: int, blur: float) -> Image.Image:
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).ellipse((inset, inset, size - inset, size - inset), fill=255)
    return m.filter(ImageFilter.GaussianBlur(blur))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("sheet", type=Path)
    ap.add_argument("tier")
    ap.add_argument("--states", help='comma-separated, one per circle in reading order; "" or "skip" drops one')
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    img = Image.open(args.sheet).convert("RGB")
    gray = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2GRAY)
    circles = reading_order(find_circles(gray))

    if args.states:
        states = [s.strip() for s in args.states.split(",")]
    elif len(circles) == 6:
        states = DEFAULT_STATES
    else:
        raise SystemExit(
            f"Found {len(circles)} circles, not the regular 6 — pass --states with one entry per "
            f"circle (reading order; \"\" or \"skip\" to drop one). Circles at: {circles}"
        )
    if len(states) != len(circles):
        raise SystemExit(f"--states has {len(states)} entries but {len(circles)} circles were found.")

    OUT.mkdir(parents=True, exist_ok=True)
    for (cx, cy, r), state in zip(circles, states):
        if state in ("", "skip"):
            print(f"skipping circle at ({cx},{cy}) r={r}")
            continue
        # Crop inside the glow ring (0.86x) so the ring itself doesn't get clipped square.
        rr = int(r * 0.86)
        crop = img.crop((cx - rr, cy - rr, cx + rr, cy + rr)).convert("RGBA")
        crop = crop.resize((SIZE, SIZE), Image.LANCZOS)
        crop.putalpha(feathered_circle_alpha(SIZE, 2, 1.2))
        path = OUT / f"{args.tier}-{state}.webp"
        if args.dry_run:
            print(f"[dry-run] would write {path} from circle at ({cx},{cy}) r={r}")
            continue
        crop.save(path, "WEBP", quality=88, method=6)
        print(f"wrote {path.relative_to(ROOT)} {crop.size} {path.stat().st_size // 1024}KB")


if __name__ == "__main__":
    main()

# /// script
# dependencies = ["pillow", "numpy", "opencv-python-headless"]
# ///
"""Slice a Nano Banana 3x2 avatar preview sheet (idle/thinking/found-it / move/celebrate/worried,
left-to-right, top-to-bottom) into individually addressable per-state portrait webp files.

Circles are found automatically via Hough transform (robust to whatever ring color the sheet
uses), then cropped tight to the ring and given a feathered circular alpha matte, matching the
landing-page portrait style (see extract-landing-assets.py).

Usage: uv run scripts/extract-avatar-sheet.py art/avatars/<tier>-sheet.png <tier>
  e.g. uv run scripts/extract-avatar-sheet.py art/avatars/sirius-sheet.png sirius
"""
import argparse
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "assets" / "avatars"
STATES = ["idle", "thinking", "found-it", "move", "celebrate", "worried"]
SIZE = 160  # matches portrait-*.webp on the landing page


def find_circles(gray: np.ndarray) -> list[tuple[int, int, int]]:
    h, w = gray.shape
    blurred = cv2.medianBlur(gray, 5)
    circles = cv2.HoughCircles(
        blurred,
        cv2.HOUGH_GRADIENT,
        dp=1.2,
        minDist=w // 5,
        param1=100,
        param2=40,
        minRadius=w // 12,
        maxRadius=w // 6,
    )
    if circles is None:
        raise SystemExit("No circles detected — check sheet layout / adjust Hough params.")
    pts = [(int(x), int(y), int(r)) for x, y, r in circles[0]]
    if len(pts) > 6:
        # Hough sometimes fits a big false circle to a nebula wisp; the 6 real avatar rings
        # cluster tightly in radius, so drop outliers relative to the median radius.
        median_r = sorted(p[2] for p in pts)[len(pts) // 2]
        pts = [p for p in pts if abs(p[2] - median_r) <= 0.3 * median_r]
    if len(pts) != 6:
        raise SystemExit(f"Expected 6 circles, found {len(pts)}: {pts}")
    # Sort into reading order: 2 rows (by y), 3 columns each (by x).
    pts.sort(key=lambda p: p[1])
    top, bottom = sorted(pts[:3], key=lambda p: p[0]), sorted(pts[3:], key=lambda p: p[0])
    return top + bottom


def feathered_circle_alpha(size: int, inset: int, blur: float) -> Image.Image:
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).ellipse((inset, inset, size - inset, size - inset), fill=255)
    return m.filter(ImageFilter.GaussianBlur(blur))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("sheet", type=Path)
    ap.add_argument("tier")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    img = Image.open(args.sheet).convert("RGB")
    gray = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2GRAY)
    circles = find_circles(gray)

    OUT.mkdir(parents=True, exist_ok=True)
    for (cx, cy, r), state in zip(circles, STATES):
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

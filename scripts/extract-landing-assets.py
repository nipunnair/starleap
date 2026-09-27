# /// script
# dependencies = ["pillow", "numpy", "opencv-python-headless"]
# ///
"""Slice art/landing-source.png into the web assets used by MenuScreen.

Run: uv run scripts/extract-landing-assets.py [--dry-run]
Outputs (src/assets/landing/): bg.webp (source with UI/board/portraits inpainted away),
board.webp, logo.webp, and one portrait per AI tier — all with feathered alpha where needed.
"""
import argparse
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art" / "landing-source.png"
OUT = ROOT / "src" / "assets" / "landing"

PORTRAITS = {"nova": (277, 528), "vega": (552, 528), "rigel": (826, 528), "sirius": (1102, 528)}
PORTRAIT_R = 72
BOARD_BOX = (400, 125, 975, 490)
LOGO_BOX = (490, 15, 865, 120)
# Regions of baked-in UI to erase from the background plate (x0, y0, x1, y1).
UI_BOXES = [BOARD_BOX, LOGO_BOX, (130, 115, 430, 430), (170, 440, 1210, 700), (570, 700, 810, 755)]


def feathered_ellipse(size, inset, blur):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).ellipse((inset, inset, size[0] - inset, size[1] - inset), fill=255)
    return m.filter(ImageFilter.GaussianBlur(blur))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    dry = ap.parse_args().dry_run
    img = Image.open(SRC).convert("RGB")
    outputs: dict[str, Image.Image] = {}

    for name, (cx, cy) in PORTRAITS.items():
        r = PORTRAIT_R
        crop = img.crop((cx - r, cy - r, cx + r, cy + r)).convert("RGBA")
        crop.putalpha(feathered_ellipse(crop.size, 2, 1.2))
        outputs[f"portrait-{name}"] = crop.resize((160, 160), Image.LANCZOS)

    board = img.crop(BOARD_BOX).convert("RGBA")
    # Octagon hugging the slab, left tip clipped just right of the
    # baked-in menu buttons so none of them leak into the cutout. Coordinates are in crop space.
    bx, by = BOARD_BOX[0], BOARD_BOX[1]
    pts = [(422, 300), (500, 190), (688, 128), (880, 190), (968, 300), (880, 425), (688, 488), (500, 425)]
    poly = [(x - bx, y - by) for x, y in pts]
    bmask = Image.new("L", board.size, 0)
    ImageDraw.Draw(bmask).polygon(poly, fill=255)
    board.putalpha(bmask.filter(ImageFilter.GaussianBlur(5)))
    outputs["board"] = board

    logo = img.crop(LOGO_BOX).convert("RGBA")
    logo.putalpha(feathered_ellipse(logo.size, 10, 18))
    outputs["logo"] = logo

    # Background plate: inpaint all UI at low-res (nebula is soft, so detail loss is invisible),
    # then upsample and lightly blur.
    small = cv2.resize(np.array(img), (688, 384), interpolation=cv2.INTER_AREA)
    mask = np.zeros(small.shape[:2], np.uint8)
    for x0, y0, x1, y1 in UI_BOXES:
        mask[y0 // 2 : y1 // 2 + 1, x0 // 2 : x1 // 2 + 1] = 255
    filled = cv2.inpaint(small, mask, 25, cv2.INPAINT_TELEA)
    filled = cv2.GaussianBlur(filled, (0, 0), 6)
    # keep the crisp original where there's no UI so stars survive
    keep = cv2.GaussianBlur(cv2.dilate(mask, np.ones((9, 9), np.uint8)), (0, 0), 5) / 255.0
    base = cv2.resize(np.array(img), (688, 384), interpolation=cv2.INTER_AREA).astype(float)
    bg = (filled * keep[..., None] + base * (1 - keep[..., None])).astype(np.uint8)
    outputs["bg"] = Image.fromarray(bg).resize((1376, 768), Image.LANCZOS)

    for name, im in outputs.items():
        path = OUT / f"{name}.webp"
        if dry:
            print(f"[dry-run] would write {path} {im.size}")
            continue
        OUT.mkdir(parents=True, exist_ok=True)
        im.save(path, "WEBP", quality=82, method=6)
        print(f"wrote {path.relative_to(ROOT)} {im.size} {path.stat().st_size // 1024}KB")


if __name__ == "__main__":
    main()

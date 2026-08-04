"""Generate LeetCoach extension icons (pure stdlib, no Pillow required).

Draws a rounded-square gradient tile with a white "L" monogram.
Usage: python scripts/generate-icons.py
"""

from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path

SIZES = [16, 32, 48, 128]
OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "icons"


def _chunk(tag: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + tag
        + data
        + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


def _write_png(path: Path, size: int, pixels: list[list[tuple[int, int, int, int]]]) -> None:
    raw = bytearray()
    for row in pixels:
        raw.append(0)  # filter type 0
        for r, g, b, a in row:
            raw += bytes((r, g, b, a))
    png = (
        b"\x89PNG\r\n\x1a\n"
        + _chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
        + _chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + _chunk(b"IEND", b"")
    )
    path.write_bytes(png)


def _rounded_rect(size: int, radius: float, x: float, y: float, w: float, h: float) -> bool:
    """True if (px,py) normalized into the rounded rectangle."""
    # Called per-pixel via closure values in render loop; kept for clarity.
    return True


def render(size: int) -> list[list[tuple[int, int, int, int]]]:
    s = float(size)
    pad = s * 0.08
    radius = s * 0.22
    img: list[list[tuple[int, int, int, int]]] = []

    def inside_round(x: float, y: float) -> bool:
        x0, y0, x1, y1 = pad, pad, s - pad, s - pad
        if x < x0 or x > x1 or y < y0 or y > y1:
            return False
        cx = max(x0 + radius, min(x, x1 - radius))
        cy = max(y0 + radius, min(y, y1 - radius))
        return (x - cx) ** 2 + (y - cy) ** 2 <= radius * radius

    # White "L" letterform as bars.
    def inside_letter(x: float, y: float) -> bool:
        vbar = (x >= s * 0.32 and x <= s * 0.47 and y >= s * 0.30 and y <= s * 0.70)
        hbar = (y >= s * 0.57 and y <= s * 0.72 and x >= s * 0.32 and x <= s * 0.72)
        return vbar or hbar

    for py in range(size):
        row: list[tuple[int, int, int, int]] = []
        for px in range(size):
            x, y = px + 0.5, py + 0.5
            if not inside_round(x, y):
                row.append((0, 0, 0, 0))
                continue
            t = y / s
            r = int(124 + (37 - 124) * t)
            g = int(58 + (99 - 58) * t)
            b = int(237 + (235 - 237) * t)
            if inside_letter(x, y):
                r, g, b = 240, 242, 255
            # subtle vignette
            edge = min(x, y, s - x, s - y)
            shade = max(0.0, 1.0 - max(0.0, pad - edge) / max(1.0, pad) * 0.35)
            row.append((int(r * shade), int(g * shade), int(b * shade), 255))
        img.append(row)
    return img


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        _write_png(OUT_DIR / f"icon{size}.png", size, render(size))
        print(f"wrote icon{size}.png")
    print("Icons ready.")


if __name__ == "__main__":
    main()

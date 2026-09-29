#!/usr/bin/env python3
"""Crop UI screenshots into report/figures/."""

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
FIGS = ROOT / "report" / "figures"
SHOTS = ROOT / "artifacts" / "screenshots"


def main():
    FIGS.mkdir(parents=True, exist_ok=True)

    crops = {
        "01-election-open.png": "fig1-election-open.png",
        "04-election-ended-winner.png": "fig2-election-ended.png",
        "03-demo-help.png": "fig3-demo-help.png",
    }
    for src, dst in crops.items():
        s = Image.open(SHOTS / src).convert("RGB")
        # Headless chrome screenshots have no browser chrome; keep full viewport
        # but trim excess empty bottom if any
        w, h = s.size
        # Prefer content region; slight trim of edges for print
        top = 0
        bottom = min(h, 780)
        c = s.crop((0, top, w, bottom))
        c.save(FIGS / dst, quality=95)
        print(dst, c.size)

    logo = FIGS / "college-logo.png"
    print("logo exists:", logo.exists(), logo.stat().st_size if logo.exists() else 0)


if __name__ == "__main__":
    main()

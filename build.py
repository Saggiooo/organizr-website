#!/usr/bin/env python3
"""Build script: generates minified CSS/JS in assets/ for production use."""

import sys
from pathlib import Path

try:
    import rcssmin
    import rjsmin
except ImportError:
    print("Missing dependencies. Run:\n  pip3 install rcssmin rjsmin")
    sys.exit(1)

ROOT = Path(__file__).parent

TARGETS = [
    (ROOT / "assets/css/style.css",          ROOT / "assets/css/style.min.css",          "CSS"),
    (ROOT / "assets/js/cookie-consent.js",   ROOT / "assets/js/cookie-consent.min.js",   "JS "),
    (ROOT / "assets/js/main.js",             ROOT / "assets/js/main.min.js",             "JS "),
]

for src, dst, kind in TARGETS:
    text = src.read_text(encoding="utf-8")
    minified = rcssmin.cssmin(text) if kind == "CSS" else rjsmin.jsmin(text)
    dst.write_text(minified, encoding="utf-8")
    before = len(text.encode())
    after  = len(minified.encode())
    pct    = (1 - after / before) * 100 if before else 0
    print(f"  {kind}  {src.name}  →  {dst.name}   {before:,} → {after:,} B  (-{pct:.0f}%)")

print("\n  Done.")

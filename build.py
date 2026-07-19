#!/usr/bin/env python3
"""Build script: generates minified CSS/JS in assets/ for production use."""

import sys
import hashlib
import re
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
    (ROOT / "assets/js/support.js",          ROOT / "assets/js/support.min.js",          "JS "),
]

ASSET_VERSION_PATTERN = re.compile(
    r"(?P<asset>(?:/|\.\./)?assets/(?:css/style\.min\.css|js/(?:cookie-consent|main|support)\.min\.js))(?:\?v=[A-Za-z0-9._-]+)?"
)

asset_versions = {}

for src, dst, kind in TARGETS:
    text = src.read_text(encoding="utf-8")
    minified = rcssmin.cssmin(text) if kind == "CSS" else rjsmin.jsmin(text)
    dst.write_text(minified, encoding="utf-8")
    asset_key = dst.relative_to(ROOT).as_posix()
    asset_versions[asset_key] = hashlib.sha256(minified.encode()).hexdigest()[:10]
    before = len(text.encode())
    after  = len(minified.encode())
    pct    = (1 - after / before) * 100 if before else 0
    print(f"  {kind}  {src.name}  →  {dst.name}   {before:,} → {after:,} B  (-{pct:.0f}%)")

updated_html = 0

for html in ROOT.rglob("*.html"):
    original = html.read_text(encoding="utf-8")

    def add_asset_version(match):
        asset = match.group("asset")
        asset_key = asset.lstrip("/")
        while asset_key.startswith("../"):
            asset_key = asset_key[3:]
        version = asset_versions.get(asset_key)
        return f"{asset}?v={version}" if version else match.group(0)

    updated = ASSET_VERSION_PATTERN.sub(add_asset_version, original)
    if updated != original:
        html.write_text(updated, encoding="utf-8")
        updated_html += 1

print(f"  HTML asset versions updated: {updated_html}")
print("\n  Done.")

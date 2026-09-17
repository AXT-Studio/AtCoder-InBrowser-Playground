#!/usr/bin/env python3
"""Fetch GCC libstdc++ pb_ds headers into engine/clang-wasi/dist/gnu-compat (not git-tracked)."""

from __future__ import annotations

import json
import shutil
import sys
import urllib.request
from pathlib import Path

GCC_REF = "releases/gcc-15.2.0"
API = "https://api.github.com/repos/gcc-mirror/gcc"
RAW = f"https://raw.githubusercontent.com/gcc-mirror/gcc/{GCC_REF}/libstdc++-v3/include"
UA = {"User-Agent": "aibp-clang-wasi-fetch-gnu-headers"}

EXTRA_FILES = (
    "ext/typelist.h",
    "ext/type_traits.h",
    "ext/numeric_traits.h",
    "bits/cpp_type_traits.h",
    "bits/version.h",
)

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist" / "gnu-compat"
STAMP = DIST / ".stamp"


def http_json(url: str) -> object:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.load(resp)


def http_bytes(url: str) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read()


def pb_ds_tree_sha() -> str:
    listing = http_json(f"{API}/contents/libstdc++-v3/include/ext?ref={GCC_REF}")
    if not isinstance(listing, list):
        raise SystemExit("unexpected GitHub contents payload for ext/")
    for item in listing:
        if item.get("name") == "pb_ds" and item.get("type") == "dir":
            sha = item["sha"]
            if isinstance(sha, str):
                return sha
    raise SystemExit("ext/pb_ds not found in gcc include tree")


def download_tree(tree_sha: str, dest_prefix: str) -> int:
    tree = http_json(f"{API}/git/trees/{tree_sha}?recursive=1")
    if not isinstance(tree, dict):
        raise SystemExit("unexpected GitHub tree payload")
    blobs = [entry for entry in tree["tree"] if entry["type"] == "blob"]
    for index, entry in enumerate(blobs, 1):
        rel = f"{dest_prefix}/{entry['path']}"
        dest = DIST / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        print(f"[{index}/{len(blobs)}] {rel}", flush=True)
        dest.write_bytes(http_bytes(f"{RAW}/{rel}"))
    return len(blobs)


def already_fetched() -> bool:
    try:
        return STAMP.read_text(encoding="utf-8").strip() == GCC_REF and (DIST / "ext/pb_ds/assoc_container.hpp").is_file()
    except OSError:
        return False


def main() -> None:
    if already_fetched():
        print(f"exists: {DIST} ({GCC_REF})")
        return
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True, exist_ok=True)
    print(f"fetching gcc {GCC_REF} pb_ds into {DIST}", flush=True)
    count = download_tree(pb_ds_tree_sha(), "ext/pb_ds")
    for rel in EXTRA_FILES:
        dest = DIST / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        print(f"[extra] {rel}", flush=True)
        dest.write_bytes(http_bytes(f"{RAW}/{rel}"))
    STAMP.write_text(f"{GCC_REF}\n", encoding="utf-8")
    print(f"wrote {count + len(EXTRA_FILES)} files to {DIST}")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # noqa: BLE001
        print(error, file=sys.stderr)
        raise SystemExit(1) from error

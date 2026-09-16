#!/usr/bin/env python3
"""Copy Emscripten clang/lld artifacts from an LLVM build dir into dist/."""

from __future__ import annotations

import shutil
import sys
from pathlib import Path


def find_one(build_bin: Path, names: list[str]) -> Path:
    for name in names:
        path = build_bin / name
        if path.is_file():
            return path
    matches: list[Path] = []
    for pattern in names:
        matches.extend(build_bin.glob(pattern))
    files = [p for p in matches if p.is_file()]
    if not files:
        listing = ", ".join(sorted(p.name for p in build_bin.iterdir())[:40])
        raise SystemExit(f"could not find {names} in {build_bin}. sample: {listing}")
    files.sort(key=lambda p: p.stat().st_size, reverse=True)
    return files[0]


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: copy-toolchain.py BUILD_DIR DIST_DIR")
    build_dir = Path(sys.argv[1])
    dist = Path(sys.argv[2])
    dist.mkdir(parents=True, exist_ok=True)
    build_bin = build_dir / "bin"

    mapping = {
        "clang.js": find_one(
            build_bin,
            ["clang.js", "clang.js-21", "clang.mjs", "clang++.js", "clang-21.js"],
        ),
        "clang.wasm": find_one(build_bin, ["clang.wasm", "clang++.wasm", "clang-21.wasm"]),
        "lld.js": find_one(build_bin, ["lld.js", "lld.mjs", "wasm-ld.js"]),
        "lld.wasm": find_one(build_bin, ["lld.wasm", "wasm-ld.wasm"]),
    }
    for dest_name, src in mapping.items():
        dest = dist / dest_name
        shutil.copy2(src, dest)
        print(f"copied {src.name} -> {dest} ({dest.stat().st_size} bytes)")

    resource = build_dir / "lib" / "clang" / "21"
    if not resource.is_dir():
        clang_lib = build_dir / "lib" / "clang"
        versions = sorted(p for p in clang_lib.glob("*") if p.is_dir()) if clang_lib.is_dir() else []
        if not versions:
            raise SystemExit(f"clang resource dir not found under {clang_lib}")
        resource = versions[-1]
    dest_resource = dist / "clang-resource"
    if dest_resource.exists():
        shutil.rmtree(dest_resource)
    shutil.copytree(resource, dest_resource)
    print(f"copied clang resource {resource} -> {dest_resource}")


if __name__ == "__main__":
    main()

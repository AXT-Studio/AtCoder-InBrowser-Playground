#!/usr/bin/env bash
# Pack wasi-sdk-28 sysroot + Clang 21 builtin headers + bits/stdc++.h shim.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/src"
DIST="$ROOT/dist"
STAGE="$SRC/sysroot-stage"
WASI_SDK_VERSION="28.0"
STDCXX_H="$ROOT/../../utils/execution/languages/cpp/stdc++.h"

rm -rf "$STAGE"
mkdir -p "$STAGE"
tar -xzf "$SRC/wasi-sysroot-${WASI_SDK_VERSION}.tar.gz" -C "$STAGE"

# tarball may unpack as wasi-sysroot-28.0/ or directly into include/lib
if [[ -d "$STAGE/wasi-sysroot-${WASI_SDK_VERSION}" ]]; then
  SYSROOT="$STAGE/wasi-sysroot-${WASI_SDK_VERSION}"
elif [[ -d "$STAGE/share/wasi-sysroot" ]]; then
  SYSROOT="$STAGE/share/wasi-sysroot"
else
  SYSROOT="$STAGE"
fi

echo "sysroot root: $SYSROOT"
find "$SYSROOT" -maxdepth 3 -type d | head -80

# Keep wasip1 (LLVM 21 / wasi-sdk-28 default). Drop threads / p2 / extra ABIs.
python3 - <<'PY' "$SYSROOT"
import shutil, sys
from pathlib import Path
root = Path(sys.argv[1])
for kind in ("include", "lib"):
    base = root / kind
    if not base.is_dir():
        continue
    for child in list(base.iterdir()):
        name = child.name
        if not child.is_dir():
            continue
        keep = name in {"wasm32-wasip1", "c++", "clang"}
        if name.startswith("wasm32-") and not keep:
            print(f"drop {child}")
            shutil.rmtree(child)
PY

# AppleDouble / Finder junk breaks the libc++ layout on macOS
find "$SYSROOT" \( -name '._*' -o -name '.DS_Store' \) -delete

# libc++ headers live under the triple in recent wasi-sdk. clang --sysroot=/ looks at include/c++/v1.
# Leave them only there so the triple path does not shadow the standard layout.
if [[ -d "$SYSROOT/include/wasm32-wasip1/c++/v1" ]]; then
  rm -rf "$SYSROOT/include/c++"
  mkdir -p "$SYSROOT/include/c++"
  mv "$SYSROOT/include/wasm32-wasip1/c++/v1" "$SYSROOT/include/c++/v1"
  rm -rf "$SYSROOT/include/wasm32-wasip1/c++"
fi

# Clang 21 builtin headers from the just-built compiler.
RESOURCE_SRC="$DIST/clang-resource"
if [[ ! -d "$RESOURCE_SRC/include" ]]; then
  echo "missing $RESOURCE_SRC/include (run copy-toolchain.py first)" >&2
  exit 1
fi
mkdir -p "$SYSROOT/lib/clang/21"
cp -R "$RESOURCE_SRC/include" "$SYSROOT/lib/clang/21/include"

# compiler-rt builtins
RT_STAGE="$STAGE/compiler-rt"
mkdir -p "$RT_STAGE"
tar -xzf "$SRC/libclang_rt-${WASI_SDK_VERSION}.tar.gz" -C "$RT_STAGE"
echo "compiler-rt layout:"
find "$RT_STAGE" -type f | head -40

python3 - <<'PY' "$RT_STAGE" "$SYSROOT"
import shutil, sys
from pathlib import Path
rt, sysroot = Path(sys.argv[1]), Path(sys.argv[2])
cands = list(rt.rglob("libclang_rt.builtins*.a"))
if not cands:
    raise SystemExit(f"no libclang_rt.builtins in {rt}")
src = next((p for p in cands if "wasip1" in str(p) and "thread" not in str(p)), None)
if src is None:
    src = next((p for p in cands if "wasi" in str(p) and "thread" not in str(p)), cands[0])
dest_dir = sysroot / "lib/clang/21/lib/wasm32-wasip1"
dest_dir.mkdir(parents=True, exist_ok=True)
shutil.copy2(src, dest_dir / "libclang_rt.builtins.a")
alias = sysroot / "lib/clang/21/lib/wasm32-unknown-wasip1"
alias.mkdir(parents=True, exist_ok=True)
shutil.copy2(src, alias / "libclang_rt.builtins.a")
print(f"builtins {src} -> {dest_dir / 'libclang_rt.builtins.a'}")
PY

mkdir -p "$SYSROOT/include/bits"
cp "$STDCXX_H" "$SYSROOT/include/bits/stdc++.h"

# Drop shared objects / LTO bitcode if present (size + WASI static link).
find "$SYSROOT" -name '*.so' -delete
find "$SYSROOT" \( -name 'llvm-lto' -o -name 'share' \) -type d -prune -exec rm -rf {} + 2>/dev/null || true
rm -f "$SYSROOT/VERSION"

rm -f "$DIST/sysroot.tar"
COPYFILE_DISABLE=1 tar -cf "$DIST/sysroot.tar" -C "$SYSROOT" .
echo "wrote $DIST/sysroot.tar ($(wc -c < "$DIST/sysroot.tar") bytes)"

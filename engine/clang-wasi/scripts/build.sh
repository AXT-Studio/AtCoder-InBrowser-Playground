#!/usr/bin/env bash
# Build Clang 21.1.0 + lld as Emscripten wasm (user programs target WASI).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/src"
DIST="$ROOT/dist"
LLVM_VERSION="21.1.0"
WASI_SDK_VERSION="28.0"
LLVM_SRC_DIR="$SRC/llvm-project-${LLVM_VERSION}.src"
JOBS="${JOBS:-6}"

mkdir -p "$SRC" "$DIST"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing required tool: $1" >&2
    if [[ "$1" == "emcc" || "$1" == "emcmake" ]]; then
      echo "Install Emscripten and put emcc/emcmake on PATH." >&2
      echo "macOS: brew install emscripten" >&2
    fi
    exit 1
  }
}

need emcc
need emcmake
need cmake
need ninja
need curl
need tar
need python3

echo "==> toolchain"
emcc --version | head -1
cmake --version | head -1
ninja --version
echo "jobs=$JOBS"

download() {
  local url="$1"
  local out="$2"
  if [[ -f "$out" ]]; then
    echo "exists: $out"
    return
  fi
  echo "download: $url"
  curl -L --fail --retry 3 -o "$out.partial" "$url"
  mv "$out.partial" "$out"
}

download \
  "https://github.com/llvm/llvm-project/releases/download/llvmorg-${LLVM_VERSION}/llvm-project-${LLVM_VERSION}.src.tar.xz" \
  "$SRC/llvm-project-${LLVM_VERSION}.src.tar.xz"

download \
  "https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-28/wasi-sysroot-${WASI_SDK_VERSION}.tar.gz" \
  "$SRC/wasi-sysroot-${WASI_SDK_VERSION}.tar.gz"

download \
  "https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-28/libclang_rt-${WASI_SDK_VERSION}.tar.gz" \
  "$SRC/libclang_rt-${WASI_SDK_VERSION}.tar.gz"

if [[ ! -d "$LLVM_SRC_DIR" ]]; then
  echo "==> extract LLVM ${LLVM_VERSION}"
  tar -xJf "$SRC/llvm-project-${LLVM_VERSION}.src.tar.xz" -C "$SRC"
fi

BUILD_DIR="$LLVM_SRC_DIR/build-emscripten"
mkdir -p "$BUILD_DIR"

# Emscripten cross-compile of clang/lld. User code later targets wasm32-wasip1
# (wasi-sdk-28 / LLVM 21 default), not the older wasm32-unknown-wasi triple.
if [[ ! -f "$BUILD_DIR/build.ninja" ]]; then
  echo "==> cmake configure"
  pushd "$LLVM_SRC_DIR" >/dev/null
  emcmake cmake -S llvm -B "$BUILD_DIR" \
    -GNinja \
    -DCMAKE_BUILD_TYPE=MinSizeRel \
    -DCMAKE_C_FLAGS="-msimd128 -mbulk-memory" \
    -DCMAKE_CXX_FLAGS="-msimd128 -mbulk-memory" \
    -DCMAKE_EXE_LINKER_FLAGS="-sINVOKE_RUN=0 -sEXIT_RUNTIME=1 -sSTACK_SIZE=4194304 -sINITIAL_HEAP=134217728 -sALLOW_MEMORY_GROWTH=1 -sMODULARIZE=1 -sEXPORT_ES6=1 -sMALLOC=dlmalloc -sFORCE_FILESYSTEM=1 -sEXPORTED_RUNTIME_METHODS=FS,callMain" \
    -DLLVM_ENABLE_PROJECTS="clang;lld" \
    -DLLVM_HOST_TRIPLE="wasm32-unknown-emscripten" \
    -DLLVM_DEFAULT_TARGET_TRIPLE="wasm32-wasip1" \
    -DLLVM_TARGETS_TO_BUILD="WebAssembly" \
    -DLLVM_ENABLE_THREADS=OFF \
    -DLLVM_BUILD_TOOLS=OFF \
    -DLLVM_INCLUDE_TESTS=OFF \
    -DLLVM_INCLUDE_BENCHMARKS=OFF \
    -DLLVM_INCLUDE_EXAMPLES=OFF \
    -DLLVM_INCLUDE_DOCS=OFF \
    -DLLVM_ENABLE_BINDINGS=OFF \
    -DLLVM_ENABLE_ZLIB=OFF \
    -DLLVM_ENABLE_ZSTD=OFF \
    -DLLVM_ENABLE_LIBXML2=OFF \
    -DLLVM_ENABLE_TERMINFO=OFF \
    -DLLVM_ENABLE_LIBEDIT=OFF \
    -DLLVM_ENABLE_DIA_SDK=OFF \
    -DCLANG_ENABLE_STATIC_ANALYZER=OFF \
    -DCLANG_ENABLE_OBJC_REWRITER=OFF \
    -DCLANG_ENABLE_HLSL=OFF \
    -DCLANG_ENABLE_LIBXML2=OFF
  popd >/dev/null
fi

echo "==> ninja clang lld (this takes a long time)"
ninja -C "$BUILD_DIR" -j "$JOBS" clang lld

echo "==> copy toolchain into dist/"
python3 "$ROOT/scripts/copy-toolchain.py" "$BUILD_DIR" "$DIST"

echo "==> package sysroot"
bash "$ROOT/scripts/package-sysroot.sh"

echo "==> fetch GNU pb_ds headers"
python3 "$ROOT/scripts/fetch-gnu-headers.py"

echo "==> done"
ls -lh "$DIST"
ls -lh "$DIST/gnu-compat" | head

#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="$ROOT/build"
DIST="$ROOT/dist"

if ! command -v emcmake >/dev/null 2>&1; then
    echo "emcmake not found. Install Emscripten and put emcc/emcmake on PATH." >&2
    echo "macOS: brew install emscripten" >&2
    exit 1
fi

bash "$ROOT/scripts/fetch-deps.sh"

mkdir -p "$BUILD" "$DIST"
emcmake cmake -S "$ROOT" -B "$BUILD" -DCMAKE_BUILD_TYPE=Release
cmake --build "$BUILD" --target emscripten-module -j"$(sysctl -n hw.ncpu 2>/dev/null || echo 4)"
echo "built $DIST/emscripten-module.mjs"

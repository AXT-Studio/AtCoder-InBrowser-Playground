#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENDOR="$ROOT/vendor"

QJS_NG_REPO="${QJS_NG_REPO:-https://github.com/quickjs-ng/quickjs.git}"
QJS_NG_TAG="${QJS_NG_TAG:-v0.16.2}"
WAMR_REPO="${WAMR_REPO:-https://github.com/bytecodealliance/wasm-micro-runtime.git}"
WAMR_TAG="${WAMR_TAG:-WAMR-2.4.1}"

clone_pin() {
    local dest="$1"
    local repo="$2"
    local tag="$3"
    if [[ -d "$dest/.git" ]]; then
        local current
        current="$(git -C "$dest" describe --tags --exact-match 2>/dev/null || true)"
        if [[ "$current" == "$tag" ]]; then
            return
        fi
        git -C "$dest" fetch --depth 1 origin "refs/tags/${tag}:refs/tags/${tag}"
        git -C "$dest" checkout --detach "$tag"
        return
    fi
    rm -rf "$dest"
    git clone --depth 1 --branch "$tag" "$repo" "$dest"
}

mkdir -p "$VENDOR"
clone_pin "$VENDOR/quickjs-ng" "$QJS_NG_REPO" "$QJS_NG_TAG"
clone_pin "$VENDOR/wamr" "$WAMR_REPO" "$WAMR_TAG"

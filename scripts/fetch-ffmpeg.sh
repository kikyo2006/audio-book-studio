#!/usr/bin/env bash
# Tai FFmpeg static lam sidecar cho Tauri vao src-tauri/binaries/ (da bi gitignore).
# Chay lai khi clone du an moi: ./scripts/fetch-ffmpeg.sh
set -euo pipefail

cd "$(dirname "$0")/.."
OUT=src-tauri/binaries
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT"

MAC_BASE=https://ffmpeg.martin-riedl.de/download/macos
WIN_URL=https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-lgpl.zip
WIN_SUMS=https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/checksums.sha256

sha256_of() { shasum -a 256 "$1" | awk '{print $1}'; }

fetch_mac() { # <arch-dir> <version-path> <target-triple>
  local zip="$TMP/$3.zip"
  curl -fsSL -o "$zip" "$MAC_BASE/$1/$2/ffmpeg.zip"
  local expected; expected="$(curl -fsSL "$MAC_BASE/$1/$2/ffmpeg.zip.sha256" | awk '{print $1}')"
  [ "$(sha256_of "$zip")" = "$expected" ] || { echo "Sai checksum: $3" >&2; exit 1; }
  unzip -q -o "$zip" ffmpeg -d "$TMP/$3"
  cp "$TMP/$3/ffmpeg" "$OUT/ffmpeg-$3"
  chmod +x "$OUT/ffmpeg-$3"
}

fetch_win() {
  local zip="$TMP/win.zip" name=ffmpeg-master-latest-win64-lgpl
  curl -fsSL -o "$zip" "$WIN_URL"
  local expected; expected="$(curl -fsSL "$WIN_SUMS" | grep "$name.zip" | awk '{print $1}')"
  [ "$(sha256_of "$zip")" = "$expected" ] || { echo "Sai checksum: windows" >&2; exit 1; }
  unzip -q -o "$zip" "$name/bin/ffmpeg.exe" -d "$TMP/win"
  cp "$TMP/win/$name/bin/ffmpeg.exe" "$OUT/ffmpeg-x86_64-pc-windows-msvc.exe"
}

TARGETS="${1:-all}"
case "$TARGETS" in
  all|mac) fetch_mac arm64 1789931890_9.0.2 aarch64-apple-darwin
           fetch_mac amd64 1789931006_9.0.2 x86_64-apple-darwin ;;&
  all|win) fetch_win ;;
esac
ls -l "$OUT"

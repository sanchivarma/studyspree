#!/usr/bin/env bash
set -euo pipefail
if ! command -v ffmpeg >/dev/null 2>&1; then echo "ffmpeg is required to prepare character loops." >&2; exit 1; fi
if [[ $# -ne 2 ]]; then echo "Usage: $0 source.mp4 male-01" >&2; exit 1; fi
source_file="$1"; slug="$2"
case "$slug" in male-0[1-4]|female-0[1-4]) ;; *) echo "Unknown character slug." >&2; exit 1;; esac
if [[ ! -f "$source_file" ]]; then echo "Source file does not exist." >&2; exit 1; fi
cd "$(dirname "$0")/.."
target="public/characters/$slug"
mkdir -p "$target"
for file in study-v1.gif poster-v1.webp; do
  if [[ -e "$target/$file" ]]; then echo "Immutable asset already exists: $target/$file. Use a new version filename." >&2; exit 1; fi
done
ffmpeg -nostdin -n -i "$source_file" -filter_complex "[0:v]fps=10,scale=480:360:force_original_aspect_ratio=decrease,pad=480:360:(ow-iw)/2:(oh-ih)/2,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer" -an -loop 0 "$target/study-v1.gif"
ffmpeg -nostdin -n -i "$source_file" -frames:v 1 -vf "scale=480:360:force_original_aspect_ratio=decrease,pad=480:360:(ow-iw)/2:(oh-ih)/2" "$target/poster-v1.webp"
echo "Prepared assets. Record their licence in public/characters/LICENCES.md and run npm run check:character-assets."

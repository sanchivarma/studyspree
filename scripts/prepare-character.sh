#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf 'Usage: %s SOURCE.mp4 SLUG\nExample: %s ~/Downloads/rain-desk.mp4 rain-desk\n' "$0" "$0" >&2
}

if [[ $# -ne 2 ]]; then
  usage
  exit 1
fi

source_file=$1
slug=$2
if [[ ! $slug =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  printf 'Error: slug must contain lowercase letters, digits and single hyphens (for example, rain-desk).\n' >&2
  exit 1
fi
if ! command -v ffmpeg >/dev/null 2>&1; then
  printf 'Error: ffmpeg is not installed or is not on PATH. Install ffmpeg with libx264 and libvpx-vp9 support, then rerun this script.\n' >&2
  exit 1
fi
if [[ ! -f $source_file || ! -r $source_file ]]; then
  printf 'Error: source MP4 is not a readable file: %s\n' "$source_file" >&2
  exit 1
fi
# Absolute input paths also handle filenames beginning with a hyphen.
source_file="$(cd -- "$(dirname -- "$source_file")" && pwd -P)/$(basename -- "$source_file")"
repo_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
output="$repo_root/public/characters/$slug"
mkdir -p -- "$output"
output=$(cd -- "$output" && pwd -P)
if [[ $output != "$repo_root/public/characters/"* ]]; then
  printf 'Error: output directory must remain inside public/characters.\n' >&2
  exit 1
fi
for filename in loop.mp4 loop.webm poster.jpg; do
  if [[ -e $output/$filename || -L $output/$filename ]]; then
    printf 'Error: refusing to overwrite immutable asset: %s\nUse a new versioned slug and update the registry paths.\n' "$output/$filename" >&2
    exit 1
  fi
done

# Encode in a private directory so an interrupted encode never becomes a
# public loop file. Cleanup removes just the three files created here.
staging=$(mktemp -d "$output/.prepare.XXXXXX")
cleanup() {
  if [[ $staging == "$output/.prepare."* ]]; then
    rm -f -- "$staging/loop.mp4" "$staging/loop.webm" "$staging/poster.jpg"
    rmdir -- "$staging" 2>/dev/null || true
  fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Clamp width without upscaling, preserve aspect ratio, and use even dimensions
# for 4:2:0 playback compatibility. Apply the same framing to all three assets.
scale="scale=w='trunc(min(1920,iw)/2)*2':h=-2,setsar=1"

printf 'Encoding %s into %s\n' "$source_file" "$output"
ffmpeg -hide_banner -nostdin -n -i "$source_file" -map 0:v:0 -an -sn -dn \
  -vf "$scale" -c:v libx264 -crf 26 -preset medium -pix_fmt yuv420p \
  -movflags +faststart "$staging/loop.mp4"
ffmpeg -hide_banner -nostdin -n -i "$source_file" -map 0:v:0 -an -sn -dn \
  -vf "$scale" -c:v libvpx-vp9 -crf 34 -b:v 0 -pix_fmt yuv420p \
  "$staging/loop.webm"
ffmpeg -hide_banner -nostdin -n -i "$source_file" -map 0:v:0 -an -sn -dn \
  -vf "$scale" -frames:v 1 -q:v 2 -update 1 "$staging/poster.jpg"

for filename in loop.mp4 loop.webm poster.jpg; do
  # Hard links publish completed files atomically and refuse existing targets.
  ln -- "$staging/$filename" "$output/$filename"
done

budget=8000000
printf '\nPrepared assets (8 MB = %s bytes per file):\n' "$budget"
for filename in loop.mp4 loop.webm poster.jpg; do
  bytes=$(wc -c < "$output/$filename")
  bytes=${bytes//[[:space:]]/}
  printf '  %-12s %s bytes\n' "$filename" "$bytes"
  if (( bytes > budget )); then
    printf 'Warning: %s exceeds the 8 MB budget. Reduce the source resolution or loop length before shipping.\n' "$filename" >&2
  fi
done

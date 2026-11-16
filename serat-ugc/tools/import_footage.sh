#!/usr/bin/env bash
# Re-creates assets/footage/*.mp4 from the original uploads (dir given as $1).
# Re-encodes to 1080x1920 30 fps with a keyframe every 0.4 s so HyperFrames seeks cleanly.
set -euo pipefail
SRC="${1:?usage: tools/import_footage.sh <folder with the original mp4s>}"
cd "$(dirname "$0")/.."; mkdir -p assets/footage
enc() { ffmpeg -v error -y -i "$1" -vf "scale=1080:1920:flags=lanczos,fps=30" -c:v libx264 -preset slow -crf 16 -g 12 -keyint_min 12 \
          -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "assets/footage/$2.mp4"; }
enc "$SRC"/*Man_clutching_stomach_on_sofa*.mp4          v1
enc "$SRC"/*Woman_eating_rendang_and_talking*.mp4       v2
enc "$SRC"/*Woman_mixing_fiber_supplement_drink*.mp4    v3
enc "$SRC"/*Adam_gives_thumbs_up*.mp4                   v4
echo done

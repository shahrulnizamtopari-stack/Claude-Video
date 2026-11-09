#!/usr/bin/env bash
# Composite the transparent captions layer over the clean plate (keeps the plate's audio).
# usage: tools/compose.sh renders/<name>_clean_1080x1920.mp4 renders/<name>_captions.mov renders/<name>_final_1080x1920.mp4
set -euo pipefail
ffmpeg -nostdin -v error -y -i "$1" -i "$2" \
  -filter_complex "[1:v]format=yuva444p[c];[0:v][c]overlay=0:0:format=auto,format=yuv420p[v]" \
  -map "[v]" -map 0:a -c:v libx264 -preset slow -crf 16 -c:a copy -movflags +faststart "$3"
echo "wrote $3"

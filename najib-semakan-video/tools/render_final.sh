#!/usr/bin/env bash
# Final render in two layers: clean plate (no captions) + transparent captions, composited with ffmpeg.
set -euo pipefail
cd "$(dirname "$0")/.."
N=najib-semakan
HF="npx --yes hyperframes@0.9.6"
mkdir -p renders
cp index.html /tmp/index.caps.bak
sed -i 's|data-composition-id="main" data-start="0"|data-composition-id="main" style="--caps: none" data-start="0"|' index.html
$HF render -q delivery -o renders/${N}_clean_1080x1920.mp4 --quiet || { cp /tmp/index.caps.bak index.html; exit 1; }
cp /tmp/index.caps.bak index.html
$HF render -c captions_only.html --format mov -o renders/${N}_captions.mov --quiet
ffmpeg -nostdin -v error -y -i renders/${N}_clean_1080x1920.mp4 -i renders/${N}_captions.mov \
  -filter_complex "[0:v][1:v]overlay=0:0:format=auto,format=yuv420p[v]" -map "[v]" -map 0:a -c:v libx264 -crf 17 -preset slow \
  -c:a copy -movflags +faststart renders/${N}_final_1080x1920.mp4
ls -la renders

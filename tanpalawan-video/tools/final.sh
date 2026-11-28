#!/usr/bin/env bash
# Final render in two layers + composite + audio remix.
set -e
cd "$(dirname "$0")/.."
DUR=$(grep -oP "DURATION = \K[\d.]+" assets/story.js)
HF="npx --yes hyperframes@0.9.6"
$HF render --format mov --variables '{"layer":2}' -o renders/kawanlawan_captions.mov
$HF render --quality delivery --variables '{"previewScale":1,"layer":1}' -o renders/kawanlawan_plate.mp4
ffmpeg -y -v error -i renders/kawanlawan_plate.mp4 -i renders/kawanlawan_captions.mov \
  -filter_complex "[0:v][1:v]overlay=0:0:format=auto[v]" -map "[v]" -c:v libx264 -crf 16 -preset slow -pix_fmt yuv420p -an renders/tmp_final_v.mp4
bash tools/remix_audio.sh renders/tmp_final_v.mp4 renders/kawanlawan_final_1080x1920.mp4 "$DUR"
bash tools/remix_audio.sh renders/kawanlawan_plate.mp4 renders/kawanlawan_plate_audio.mp4 "$DUR"
rm renders/tmp_final_v.mp4
echo DONE

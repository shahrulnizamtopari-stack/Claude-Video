#!/usr/bin/env bash
# Re-creates assets/footage/*.mp4 from the original uploads (dir given as $1).
# Re-encodes to 1080x1920 @30 fps with a keyframe every 0.4 s so HyperFrames seeks cleanly.
set -euo pipefail
SRC="${1:?usage: tools/import_footage.sh <folder with the original mp4s>}"
cd "$(dirname "$0")/.."; mkdir -p assets/footage
enc() { ffmpeg -v error -y -i "$1" -vf "scale=1080:1920:flags=lanczos,fps=30" -c:v libx264 -preset slow -crf 16 -g 12 -keyint_min 12 -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -movflags +faststart "assets/footage/$2.mp4"; }
enc "$SRC"/*Man_talking_about_feeling_tired*.mp4      th1_penat
enc "$SRC"/*Man_holding_beetroot_gummies_box*.mp4     th2_kotak
enc "$SRC"/*Man_holding_product_explaining_g*.mp4     th3_terang
enc "$SRC"/*Man_holding_gummy_box_*.mp4               th4_cta
enc "$SRC"/*Careleaf_Beetroot_Gummies_pyrami*.mp4     br_produk
enc "$SRC"/*Father_playing_football_with_son*.mp4     br_bola
enc "$SRC"/*Man_yawning_at_office_desk*.mp4           br_menguap
enc "$SRC"/*Beetroot_spinning_in_blender*.mp4         br_blender
echo done

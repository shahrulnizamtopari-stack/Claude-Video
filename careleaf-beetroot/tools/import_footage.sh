#!/usr/bin/env bash
# Re-creates assets/footage/*.mp4 from the original uploads (dir given as $1).
# Re-encodes to 1080x1920 30 fps with a keyframe every 0.4 s so HyperFrames seeks cleanly.
set -euo pipefail
SRC="${1:?usage: tools/import_footage.sh <folder with the original mp4s>}"
cd "$(dirname "$0")/.."; mkdir -p assets/footage
enc() { ffmpeg -v error -y -i "$1" -vf "scale=1080:1920:flags=lanczos,fps=30" -c:v libx264 -preset slow -crf 16 -g 12 -keyint_min 12 \
          -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "assets/footage/$2.mp4"; }
enc "$SRC"/*Man_speaking_about_feeling_dizzy*.mp4        v1_hook
enc "$SRC"/*Man_warning_and_presenting_product*.mp4      v2_produk
enc "$SRC"/*Man_explaining_beetroot_gummies*.mp4         v3_cara
enc "$SRC"/*Man_holding_product_promoting*.mp4           v4_cta
enc "$SRC"/*Man_standing_up_feeling_dizzy*.mp4           br_pitam
enc "$SRC"/*Man_resting_on_staircase*.mp4                br_tangga
enc "$SRC"/*Particles_flowing_through_arm*.mp4           br_aliran
enc "$SRC"/*Knife_slicing_through_fresh_beet*.mp4        br_beet

ffmpeg -v error -y -sseof -0.05 -i assets/footage/v4_cta.mp4 -frames:v 1 -f image2pipe -vcodec png - | ffmpeg -v error -y -loop 1 -t 1.5 -framerate 30 -f image2pipe -i - -c:v libx264 -preset slow -crf 16 -g 12 -pix_fmt yuv420p assets/footage/v4_hold.mp4   # end freeze for the CTA
echo done

#!/usr/bin/env bash
# Re-creates assets/footage/*.mp4 from the original uploads (dir given as $1).
# Re-encodes with a keyframe every 0.5 s so HyperFrames seeks cleanly, and builds the reversed veg clip.
set -euo pipefail
SRC="${1:?usage: tools/import_footage.sh <folder with the original mp4s>}"
cd "$(dirname "$0")/.."; mkdir -p assets/footage
enc() { ffmpeg -v error -y -i "$1" -c:v libx264 -preset slow -crf 16 -g 12 -keyint_min 12 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "assets/footage/$2.mp4"; }
enc "$SRC"/*Man_teasing_friend_about_vegetables*.mp4 th1_sayur
enc "$SRC"/*Man_talking_about_fiber_intake*.mp4      th2_serat
enc "$SRC"/*Man_presenting_fiber_drink_product*.mp4  th3_produk
enc "$SRC"/*Man_speaking_with_food_directions*.mp4   th4_arahan
enc "$SRC"/*Man_speaking_about_food_details*.mp4     th5_cta
enc "$SRC"/*Hand_holding_product_video*.mp4          br_box
enc "$SRC"/*Spoon_moving_vegetable_on_plate*.mp4     br_sayur
enc "$SRC"/*CGI_animation_of_intestinal*.mp4         br_usus
ffmpeg -v error -y -i assets/footage/br_sayur.mp4 -vf reverse -an -c:v libx264 -preset slow -crf 16 -g 12 -pix_fmt yuv420p assets/footage/br_sayur_rev.mp4
echo done

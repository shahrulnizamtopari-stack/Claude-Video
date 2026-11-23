#!/usr/bin/env bash
# Bakes every satellite map shot for this episode (Esri World Imagery via MapLibre, see tools/bake-basemap.mjs).
# Run from a folder that has puppeteer-core installed: BAKEDIR=<that folder> tools/bake_all.sh
set -e
EP=$(cd "$(dirname "$0")/.." && pwd); OUTD=$EP/assets/maps; mkdir -p $OUTD
cp $EP/tools/bake-basemap.mjs $BAKEDIR/; cd $BAKEDIR
export CHROME=${CHROME:-/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell}
export SHAPES=$EP/maps-src/shapes.json OUT=$BAKEDIR/out PROJECTION=globe FPS=30
b() { env "$@" node bake-basemap.mjs 2>&1 | grep -v "s/frame"; }
# 1 opener: space -> Kelantan (lands at p 0.7 = 5.3 s)
b NAME=dive FROM="96,14" CENTER="101.95,5.25" ZSTART=1.9 ZEND=8.45 PITCH=30 DUR=7.6 PAN=0.4 HOLD=0.7
# 2 globe: hold on Kelantan, turn to the Pacific, hold with both pins
b NAME=globe FROM="102,6" CENTER="150,17" ZSTART=2.5 ZEND=1.72 PITCH=0 DUR=9.6 PANSTART=0.24 PAN=0.5 HOLD=0.5
# 3 march: the peninsula, one still plate (slow zoom is done in CSS so the overlay stays locked)
b NAME=march CENTER="102.15,4.0" ZSTART=7.2 ZEND=7.2 DUR=0.034 HOLD=0
# 4 today: Kelantan -> Pantai Sabak, tilted
b NAME=sabak CENTER="102.334,6.1765" ZSTART=8.6 ZEND=14.6 PITCH=45 DUR=7.4 HOLD=0.72
# 5 outro: all of Malaysia (still), then back out to space (ends on the opener's first frame)
b NAME=outro CENTER="109.3,4.4" ZSTART=5.0 ZEND=5.0 DUR=0.034 HOLD=0
b NAME=out FROM="109.3,4.4" CENTER="96,14" ZSTART=5.0 ZEND=1.9 PITCH=0 DUR=2.6 PAN=1 HOLD=1
for n in dive globe march sabak outro out; do
  [ -f out/$n.mp4 ] && cp out/$n.mp4 $OUTD/; for j in out/$n-shapes*.json; do [ -f $j ] && cp $j $OUTD/; done
done
for n in march outro; do ffmpeg -nostdin -y -loglevel error -i out/frames-$n/f0000.png -q:v 2 $OUTD/$n.jpg; done
echo BAKE_DONE

#!/usr/bin/env bash
# Bakes every satellite map shot for this episode (Esri World Imagery via MapLibre, see tools/bake-basemap.mjs).
# Run from a folder that has puppeteer-core installed: BAKEDIR=<that folder> tools/bake_all.sh
set -e
EP=$(cd "$(dirname "$0")/.." && pwd); OUTD=$EP/assets/maps; mkdir -p $OUTD
cp $EP/tools/bake-basemap.mjs $BAKEDIR/; cd $BAKEDIR
export CHROME=${CHROME:-/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell}
export SHAPES=$EP/maps-src/shapes.json OUT=$BAKEDIR/out-$(basename $EP) PROJECTION=globe FPS=30
mkdir -p $OUT
b() { env "$@" node bake-basemap.mjs 2>&1 | grep -v "s/frame"; }
# 1 opener: space -> Terengganu coast (lands at p 0.62)
b NAME=dive FROM="96,14" CENTER="103.0,5.0" ZSTART=1.9 ZEND=7.7 PITCH=30 DUR=7.0 PAN=0.4 HOLD=0.62
# 2 Terengganu coast at Kuala Terengganu, tilted towards the sea (held view for the outro question)
b NAME=coast FROM="103.0,5.0" CENTER="103.13,5.33" ZSTART=7.7 ZEND=11.2 PITCH=55 BEARING=20 DUR=3.0 PAN=0.5 HOLD=0.85
# 5 outro: all of Malaysia (still), then back out to space (ends on the opener's first frame)
# reused from ep02: b NAME=outro CENTER="109.4,4.3" ZSTART=5.75 ZEND=5.75 DUR=0.034 HOLD=0
# reused from ep02: b NAME=out FROM="109.4,4.3" CENTER="96,14" ZSTART=5.75 ZEND=1.9 PITCH=0 DUR=2.6 PAN=1 HOLD=1
for n in dive coast outro out; do
  [ -f $OUT/$n.mp4 ] && cp $OUT/$n.mp4 $OUTD/; for j in $OUT/$n-shapes*.json; do [ -f $j ] && cp $j $OUTD/; done
done
ffmpeg -nostdin -y -loglevel error -i $OUT/frames-outro/f0000.png -q:v 2 $OUTD/outro.jpg
ffmpeg -nostdin -y -loglevel error -i $OUT/frames-coast/f$(printf %04d $(( $(ls $OUT/frames-coast | wc -l) - 1 ))).png -q:v 2 $OUTD/coast-last.jpg
echo BAKE_DONE

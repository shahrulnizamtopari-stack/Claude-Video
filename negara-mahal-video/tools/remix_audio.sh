#!/usr/bin/env bash
# Re-mix the final audio without re-rendering video: louder, compressed VO + SFX ducked under the voice.
# usage: tools/remix_audio.sh renders/<name>_final_1080x1920.mp4 renders/<name>_final_v2_1080x1920.mp4 <duration>
set -e
IN=$1; OUT=$2; DUR=$3
ffmpeg -y -v error -i "$IN" -i assets/voiceover.mp3 -i assets/sfx.wav -filter_complex \
 "[1:a]aresample=48000,acompressor=threshold=-24dB:ratio=3:attack=5:release=120:makeup=4dB,volume=1.4,asplit=2[vo][vosc];[2:a]aresample=48000,volume=0.9[sx];[sx][vosc]sidechaincompress=threshold=0.06:ratio=2.5:attack=10:release=250[sxd];[vo][sxd]amix=inputs=2:normalize=0:duration=longest,apad,atrim=0:$DUR,loudnorm=I=-13:TP=-1.0:LRA=9[a]" \
 -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -movflags +faststart "$OUT"

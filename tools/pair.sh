#!/usr/bin/env bash
# Blind A/B pair for a critic: tools/pair.sh <our.png> <reference.jpg> <outdir>
# Writes A.png and B.png in random order plus reveal.txt saying which one is ours.
set -euo pipefail
ours=$1; ref=$2; out=$3
mkdir -p "$out"
if (( RANDOM % 2 )); then a=$ours; b=$ref; r="A = our render, B = reference photo"; else a=$ref; b=$ours; r="A = reference photo, B = our render"; fi
ffmpeg -v error -y -i "$a" -vf scale=1280:720 "$out/A.png"
ffmpeg -v error -y -i "$b" -vf scale=1280:720 "$out/B.png"
echo "$r" > "$out/reveal.txt"

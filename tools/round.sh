#!/usr/bin/env bash
# Prepare one critic round: render a view of the full scene and make a blind A/B pair.
# usage: tools/round.sh <piece> <round> <view> <reference image> [extra shoot flags...]
set -euo pipefail
cd "$(dirname "$0")/.."
piece=$1; round=$2; view=$3; ref=$4; shift 4
dir=shots/rounds/$piece/r$round/$view
mkdir -p "$dir"
node tools/shoot.mjs "$dir" "$view" "$@" | tail -5
tools/pair.sh "$dir/$view.png" "$ref" "$dir/pair"
echo "$dir"

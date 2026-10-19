#!/usr/bin/env bash
# Bundle the walkthrough into a self-contained static folder: tools/bundle.sh <outdir>
set -euo pipefail
cd "$(dirname "$0")/.."
out=$1
rm -rf "$out"; mkdir -p "$out/reference/frames"
npx -y esbuild@0.25.10 src/main.js --bundle --format=esm --minify --target=es2022 \
  --alias:three=./vendor/three/build/three.module.js \
  --alias:three/addons=./vendor/three/addons \
  --outfile="$out/bundle.js" --log-level=warning
sed -e '/<script type="importmap">/,/<\/script>/d' -e 's#./src/main.js#./bundle.js#' index.html > "$out/index.html"
cp -r views "$out/"
mkdir -p "$out/assets"; find assets -name '*.jpg' -exec cp --parents {} "$out/" \;
for f in $(grep -ho 'reference/frames/t[0-9]*\.jpg' views/*.json | sort -u); do cp "$f" "$out/$f"; done
find "$out" -type f | wc -l; du -sh "$out"

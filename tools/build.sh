#!/usr/bin/env bash
# Локальная сборка статических ресурсов: Tailwind CSS + бандл Three.js. Нужен Node 18+.
set -euo pipefail
cd "$(dirname "$0")"
[ -d node_modules ] || npm install --no-audit --no-fund
npx tailwindcss -c tailwind.config.js -i input.css -o ../assets/tailwind.css --minify
npx esbuild three-scene.src.js --bundle --minify --format=iife --target=es2019 --legal-comments=none --outfile=../assets/geometry3d.js
ls -l ../assets

#!/usr/bin/env bash
# Генерирует демонстрационные видеоклипы (9:16) целиком локально через ffmpeg.
# Никаких внешних источников: видео строятся из математических генераторов (lavfi).
# Результат: media/clips/*.mp4 (H.264+AAC, Safari/iPad), *.webm (VP9+Opus), *.jpg (постеры)
#            media/hls/*  (локальный HLS-поток для нативного воспроизведения в Safari)
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=media/clips
mkdir -p "$OUT" media/hls
DUR=6
W=360; H=640; FPS=24

# audio <name> <базовая частота> <ноты в полутонах, 4 штуки>
audio() {
  local f=$2; local n=($3 $4 $5 $6)
  ffmpeg -y -v error -f lavfi -i "aevalsrc='0.22*sin(2*PI*${f}*pow(2,if(lt(mod(t,1),0.25),${n[0]},if(lt(mod(t,1),0.5),${n[1]},if(lt(mod(t,1),0.75),${n[2]},${n[3]})))/12)*mod(t,0.25))*exp(-9*mod(t,0.25))*(1-exp(-300*mod(t,0.25)))+0.06*sin(2*PI*${f}/2*t)':s=44100:d=${DUR}" \
    -af "aecho=0.7:0.6:180|320:0.35|0.2,lowpass=f=4200,afade=t=in:d=0.3,afade=t=out:st=$((DUR-1)):d=1" "$OUT/$1.wav"
}

# encode <name> <video filter graph> <audio basefreq> <notes...>
encode() {
  local name=$1; local graph=$2; shift 2
  audio "$name" "$@"
  ffmpeg -y -v error -f lavfi -i "${graph}" -i "$OUT/$name.wav" -t $DUR \
    -vf "format=yuv420p" -c:v libx264 -profile:v high -level 4.0 -preset slow -crf 34 -r $FPS -g 48 -maxrate 700k -bufsize 1400k \
    -c:a aac -b:a 64k -movflags +faststart -shortest "$OUT/$name.mp4"
  ffmpeg -y -v error -i "$OUT/$name.mp4" -c:v libvpx-vp9 -b:v 0 -crf 46 -row-mt 1 -deadline good -cpu-used 4 \
    -c:a libopus -b:a 48k "$OUT/$name.webm"
  ffmpeg -y -v error -ss 1.5 -i "$OUT/$name.mp4" -frames:v 1 -vf "scale=270:480" -q:v 6 "$OUT/$name.jpg"
  rm -f "$OUT/$name.wav"
  echo "ok: $name"
}

encode mandelbrot \
  "mandelbrot=s=${W}x${H}:rate=${FPS}:start_scale=3:end_scale=0.004:end_pts=$((DUR*FPS)):maxiter=500:outer=normalized_iteration_count:inner=black,hue=h=200:s=1.4,eq=contrast=1.1:saturation=1.0" \
  196 0 7 12 7

encode life \
  "life=s=90x160:rate=${FPS}:ratio=0.2:mold=14:random_seed=11:life_color=#7cf3ff:death_color=#6d28d9:stitch=1,scale=${W}:${H}:flags=neighbor" \
  220 0 3 7 10

encode rule110 \
  "cellauto=s=90x160:rate=${FPS}:rule=110:random_fill_ratio=0.5:random_seed=3:scroll=1:full=1,scale=${W}:${H}:flags=neighbor,lutrgb=r='val*0.35':g='val*0.95':b='val'" \
  174 0 5 8 12

encode sierpinski \
  "sierpinski=s=${W}x${H}:rate=${FPS}:seed=5:jump=2:type=triangle,lutrgb=r='val':g='val*0.55':b='val*0.95',eq=saturation=1.4" \
  247 0 4 9 4

encode waves \
  "nullsrc=s=180x320:rate=${FPS},format=gbrp,geq=r='70+70*sin(X/13+T*2.0)*cos(Y/15-T)':g='60+60*sin(Y/10-T*1.5+X/37)':b='170+85*sin((X+Y)/14+T*3)',scale=${W}:${H}:flags=bicubic,eq=saturation=1.2" \
  165 0 7 12 16

# Локальный HLS-поток (Safari/iPad воспроизводит .m3u8 нативно, без внешних плееров)
ffmpeg -y -v error -i "$OUT/waves.mp4" -c:v libx264 -profile:v main -preset medium -crf 33 -g 48 -sc_threshold 0 \
  -c:a aac -b:a 64k -f hls -hls_time 2 -hls_playlist_type vod -hls_flags independent_segments \
  -hls_segment_filename "media/hls/seg_%03d.ts" media/hls/stream.m3u8
cp "$OUT/waves.jpg" media/hls/poster.jpg
echo "HLS ok"

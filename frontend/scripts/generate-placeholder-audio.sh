#!/usr/bin/env bash
# Generates placeholder sound effects + ambient music for Raspe SOL using
# only ffmpeg's synthetic audio sources (sine/anoisesrc) — no network, no
# external samples. These are intentionally simple sine-tone UI blips and
# arpeggios: good enough to make the app audible and to verify AudioManager
# wiring end-to-end, NOT a substitute for real sound design. Swap any file
# here for a proper asset at any time; nothing else needs to change.
set -euo pipefail

EFFECTS_DIR="$(dirname "$0")/../public/audio/effects"
MUSIC_DIR="$(dirname "$0")/../public/audio/music"
mkdir -p "$EFFECTS_DIR" "$MUSIC_DIR"

mp3() { # mp3 <output> <ffmpeg input/filter args...>
  local out="$1"; shift
  ffmpeg -y -loglevel error "$@" -codec:a libmp3lame -b:a 128k "$out"
}

tone() { # tone <freq> <dur> -> lavfi input args for a single sine
  echo "-f lavfi -i sine=frequency=$1:duration=$2"
}

# ---- Simple single-tone blips ---------------------------------------------

mp3 "$EFFECTS_DIR/click.mp3" \
  -f lavfi -i "sine=frequency=900:duration=0.06" \
  -af "afade=t=out:st=0.03:d=0.03,volume=0.6"

mp3 "$EFFECTS_DIR/hover.mp3" \
  -f lavfi -i "sine=frequency=1400:duration=0.04" \
  -af "afade=t=out:st=0.02:d=0.02,volume=0.25"

mp3 "$EFFECTS_DIR/result-none.mp3" \
  -f lavfi -i "sine=frequency=420:duration=0.18" \
  -af "afade=t=out:st=0.08:d=0.1,volume=0.35"

# ---- Two/three-note glides (concatenated short tones) ----------------------

two_note() {
  local out="$1" f1="$2" f2="$3" d="${4:-0.09}" vol="${5:-0.5}"
  ffmpeg -y -loglevel error \
    -f lavfi -i "sine=frequency=$f1:duration=$d" \
    -f lavfi -i "sine=frequency=$f2:duration=$d" \
    -filter_complex "[0]afade=t=out:st=$(awk "BEGIN{printf \"%.3f\", $d*0.6}"):d=$(awk "BEGIN{printf \"%.3f\", $d*0.4}"),volume=$vol[a0];[1]afade=t=out:st=$(awk "BEGIN{printf \"%.3f\", $d*0.6}"):d=$(awk "BEGIN{printf \"%.3f\", $d*0.4}"),volume=$vol[a1];[a0][a1]concat=n=2:v=0:a=1[out]" \
    -map "[out]" -codec:a libmp3lame -b:a 128k "$out"
}

two_note "$EFFECTS_DIR/window-open.mp3"    500 850 0.07 0.4
two_note "$EFFECTS_DIR/window-close.mp3"   850 500 0.07 0.4
two_note "$EFFECTS_DIR/wallet-connect.mp3" 550 880 0.08 0.45
two_note "$EFFECTS_DIR/wallet-disconnect.mp3" 700 450 0.08 0.4
two_note "$EFFECTS_DIR/admin-batch-created.mp3" 750 1100 0.08 0.4

# Purchase start: rising 2-note, slightly longer/brighter
two_note "$EFFECTS_DIR/purchase-start.mp3" 600 950 0.11 0.5

# Admin error: urgent alternating beeps (3 short low tones)
mp3 "$EFFECTS_DIR/admin-error.mp3" \
  -f lavfi -i "sine=frequency=900:duration=0.08" \
  -f lavfi -i "sine=frequency=700:duration=0.08" \
  -f lavfi -i "sine=frequency=900:duration=0.08" \
  -filter_complex "[0]afade=t=out:st=0.05:d=0.03,volume=0.5[a0];[1]afade=t=out:st=0.05:d=0.03,volume=0.5[a1];[2]afade=t=out:st=0.05:d=0.03,volume=0.5[a2];[a0][a1][a2]concat=n=3:v=0:a=1[out]" \
  -map "[out]"

# Payment error: low buzzy tone via tremolo on a low sine
mp3 "$EFFECTS_DIR/payment-error.mp3" \
  -f lavfi -i "sine=frequency=180:duration=0.28" \
  -af "tremolo=f=28:d=0.8,volume=0.5,afade=t=out:st=0.2:d=0.08"

# ---- Arpeggios (3-4 ascending notes, major-ish chord) ----------------------

arpeggio() {
  local out="$1" vol="$2" d="$3"; shift 3
  local freqs=("$@")
  local inputs=() filters=() labels=()
  local i=0
  for f in "${freqs[@]}"; do
    inputs+=(-f lavfi -i "sine=frequency=$f:duration=$d")
    filters+=("[$i]afade=t=out:st=$(awk "BEGIN{printf \"%.3f\", $d*0.65}"):d=$(awk "BEGIN{printf \"%.3f\", $d*0.35}"),volume=$vol[a$i];")
    labels+=("[a$i]")
    i=$((i+1))
  done
  local filter_complex="${filters[*]}$(IFS=; echo "${labels[*]}")concat=n=${#freqs[@]}:v=0:a=1[out]"
  ffmpeg -y -loglevel error "${inputs[@]}" -filter_complex "$filter_complex" -map "[out]" -codec:a libmp3lame -b:a 128k "$out"
}

# purchase-success: C E G ascending
arpeggio "$EFFECTS_DIR/purchase-success.mp3" 0.45 0.09 523 659 784

# payment-confirmed: bright ping, two harmonics overlapped via a short 2-note glide up
arpeggio "$EFFECTS_DIR/payment-confirmed.mp3" 0.45 0.1 784 1175

# result-small-win: quick 2-note lift
arpeggio "$EFFECTS_DIR/result-small-win.mp3" 0.45 0.09 700 1050

# result-win: fuller C E G C arpeggio
arpeggio "$EFFECTS_DIR/result-win.mp3" 0.5 0.11 523 659 784 1047

# result-big-win: two passes of the arpeggio (longer, bigger)
arpeggio "$EFFECTS_DIR/result-big-win.mp3" 0.55 0.1 523 659 784 1047 1319

# result-epic-win: long fanfare, five ascending notes plus octave finale
arpeggio "$EFFECTS_DIR/result-epic-win.mp3" 0.6 0.14 523 659 784 1047 1319 1568

# ---- Textures: scratch loop, confetti sparkle -------------------------------

# Scratch loop: band-passed pink noise, gently gated for a grainy foil feel.
# Not a perfectly seamless loop (offline synthesis, no crossfade source) —
# fine as a placeholder; swap for a real recorded/sfx loop when available.
mp3 "$EFFECTS_DIR/scratch-loop.mp3" \
  -f lavfi -i "anoisesrc=color=pink:duration=1.0:amplitude=0.6" \
  -af "bandpass=f=2200:width_type=h:w=2800,tremolo=f=18:d=0.5,volume=0.35,afade=t=in:st=0:d=0.05,afade=t=out:st=0.92:d=0.08"

# Confetti: short filtered noise burst + a couple of high sparkle blips
ffmpeg -y -loglevel error \
  -f lavfi -i "anoisesrc=color=white:duration=0.25:amplitude=0.5" \
  -f lavfi -i "sine=frequency=1800:duration=0.12" \
  -f lavfi -i "sine=frequency=2400:duration=0.12" \
  -filter_complex "[0]highpass=f=4000,afade=t=out:st=0.1:d=0.15,volume=0.3[n];[1]afade=t=out:st=0.06:d=0.06,volume=0.3,adelay=60|60[s1];[2]afade=t=out:st=0.06:d=0.06,volume=0.25,adelay=110|110[s2];[n][s1][s2]amix=inputs=3:duration=longest[out]" \
  -map "[out]" -codec:a libmp3lame -b:a 128k "$EFFECTS_DIR/confetti.mp3"

# ---- Ambient background music: soft sustained triad, ~6s loop -------------

ffmpeg -y -loglevel error \
  -f lavfi -i "sine=frequency=220:duration=6" \
  -f lavfi -i "sine=frequency=277:duration=6" \
  -f lavfi -i "sine=frequency=330:duration=6" \
  -filter_complex "[0]volume=0.12[a];[1]volume=0.1[b];[2]volume=0.09[c];[a][b][c]amix=inputs=3:duration=longest[mix];[mix]afade=t=in:st=0:d=1.2,afade=t=out:st=4.8:d=1.2[out]" \
  -map "[out]" -codec:a libmp3lame -b:a 96k "$MUSIC_DIR/ambient-loop.mp3"

echo "Done. Generated files:"
find "$EFFECTS_DIR" "$MUSIC_DIR" -name "*.mp3" | sort

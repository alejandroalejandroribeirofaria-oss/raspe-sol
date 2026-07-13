# Audio files

**Status: placeholder sounds are already generated and present** in this
folder — the app is audible out of the box. They were synthesized entirely
offline with `frontend/scripts/generate-placeholder-audio.sh` (ffmpeg sine
tones, arpeggios, and filtered noise — no external samples, no network
needed), so every filename `AudioManager` expects already exists.

These are simple, clean UI blips and arpeggios — good enough to verify the
whole audio system end-to-end and to ship a non-silent MVP, but they are
**not real sound design**. Swap any file below for a proper asset whenever
you're ready; nothing else needs to change, since everything goes through
`src/audio/config.js`'s filename map.

To regenerate the placeholders (e.g. after tweaking the script):
```bash
cd frontend/scripts && bash generate-placeholder-audio.sh
```

## frontend/public/audio/effects/

| File                        | Used for                                   | Suggested feel                  |
|------------------------------|---------------------------------------------|----------------------------------|
| click.mp3                    | any button press                            | short, dry click (~80ms)         |
| hover.mp3                    | desktop hover on the primary CTA            | very short, subtle tick          |
| window-open.mp3              | volume menu (or any panel) opening          | soft whoosh up                   |
| window-close.mp3             | volume menu (or any panel) closing          | soft whoosh down                 |
| purchase-start.mp3           | order created, about to prompt wallet       | rising chime                     |
| purchase-success.mp3         | order fully paid                            | upbeat confirmation chime        |
| wallet-connect.mp3           | Phantom connected                           | positive blip                    |
| wallet-disconnect.mp3        | Phantom disconnected                        | descending blip                  |
| payment-confirmed.mp3        | on-chain confirmation received              | coin/chime                       |
| payment-error.mp3            | payment cancelled/rejected/failed           | low buzz, not harsh              |
| scratch-loop.mp3             | looped while actively scratching            | soft grainy foil texture, seamless loop |
| result-none.mp3              | ticket revealed, no prize                   | short, discreet, neutral         |
| result-small-win.mp3         | 0.02–0.05 SOL prize                         | small upbeat sting               |
| result-win.mp3               | 0.2–1 SOL prize                             | fuller win jingle                |
| result-big-win.mp3           | 2 SOL prize                                 | bigger fanfare                   |
| result-epic-win.mp3          | 5 SOL prize                                 | multi-second epic fanfare         |
| confetti.mp3                 | plays alongside any winning reveal          | sparkle/pop, syncs with confetti animation |
| admin-batch-created.mp3      | (reserved for an admin panel, if built)     | confirmation tone                |
| admin-error.mp3              | (reserved for an admin panel, if built)     | alert tone                       |

## frontend/public/audio/music/

| File                | Used for                          |
|----------------------|-------------------------------------|
| ambient-loop.mp3     | optional background music, starts only after the first user gesture, loops at low volume |

## Notes

- All effects are loaded as plain HTML5 `<audio>` — any browser-supported
  format works (`.mp3` is the safest cross-browser default; `.ogg`/`.m4a`
  also fine, just update the extensions in `src/audio/config.js`).
- Keep effect files small (a few KB to ~50KB) — `preload: true` entries in
  `config.js` are fetched immediately on app boot.
- `scratch-loop.mp3` and `ambient-loop.mp3` should loop seamlessly (no pop
  at the seam) since they're played with the native `loop` attribute. The
  generated placeholders are close but not perfectly seamless (a faint pop
  is possible at the loop point) — fine for now, worth a real seamless loop
  before shipping to real users.

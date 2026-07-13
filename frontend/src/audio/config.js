// Central registry of every sound the app can play. Paths are relative to
// /public, so drop matching files into frontend/public/audio/... — nothing
// else needs to change.
//
// preload: true  -> fetched as soon as AudioManager boots (small UI blips)
// preload: false -> fetched lazily on first use (bigger win/music files)
export const EFFECTS = {
  // Interface
  click: { src: '/audio/effects/click.mp3', preload: true },
  hover: { src: '/audio/effects/hover.mp3', preload: true },
  windowOpen: { src: '/audio/effects/window-open.mp3', preload: true },
  windowClose: { src: '/audio/effects/window-close.mp3', preload: true },
  purchaseStart: { src: '/audio/effects/purchase-start.mp3', preload: true },
  purchaseSuccess: { src: '/audio/effects/purchase-success.mp3', preload: false },

  // Phantom wallet
  walletConnect: { src: '/audio/effects/wallet-connect.mp3', preload: true },
  walletDisconnect: { src: '/audio/effects/wallet-disconnect.mp3', preload: true },
  paymentConfirmed: { src: '/audio/effects/payment-confirmed.mp3', preload: false },
  paymentError: { src: '/audio/effects/payment-error.mp3', preload: false },

  // Scratching (looped while the pointer is down and moving)
  scratchLoop: { src: '/audio/effects/scratch-loop.mp3', preload: false, loop: true },

  // Results, keyed by prize tier
  resultNone: { src: '/audio/effects/result-none.mp3', preload: false },
  resultSmallWin: { src: '/audio/effects/result-small-win.mp3', preload: false },
  resultWin: { src: '/audio/effects/result-win.mp3', preload: false },
  resultBigWin: { src: '/audio/effects/result-big-win.mp3', preload: false },
  resultEpicWin: { src: '/audio/effects/result-epic-win.mp3', preload: false },
  confetti: { src: '/audio/effects/confetti.mp3', preload: false },

  // Admin
  adminBatchCreated: { src: '/audio/effects/admin-batch-created.mp3', preload: false },
  adminError: { src: '/audio/effects/admin-error.mp3', preload: false },
};

export const MUSIC_TRACKS = {
  ambient: { src: '/audio/music/ambient-loop.mp3' },
};

export const DEFAULT_MUSIC_TRACK = 'ambient';

export const VOLUME_PRESETS = [1, 0.75, 0.5, 0.25, 0];

export const DEFAULT_PREFS = {
  volume: 0.75,
  muted: false,
  sfxEnabled: true,
  musicEnabled: true,
};

export const STORAGE_KEY = 'raspesol:audio-prefs';

// Given a prize in lamports, picks which result stinger to play. Tuned to
// the five-tier prize table (0 / 0.02 / 0.05 / 0.2 / 1 / 2 / 5 SOL).
export function resultEffectForPrize(prizeLamports) {
  const sol = prizeLamports / 1e9;
  if (sol <= 0) return 'resultNone';
  if (sol < 0.1) return 'resultSmallWin';
  if (sol < 1) return 'resultWin';
  if (sol < 5) return 'resultBigWin';
  return 'resultEpicWin';
}


// Sem sons por enquanto pra parar de quebrar
export const EFFECTS = {}

export const MUSIC_TRACKS = {}

export const DEFAULT_MUSIC_TRACK = null

export const VOLUME_PRESETS = [1, 0.75, 0.5, 0.25, 0]

export const DEFAULT_PREFS = {
  volume: 0.75,
  muted: true, // <- já deixa mutado
  sfxEnabled: false, // <- desativa som
  musicEnabled: false, // <- desativa música
}

export const STORAGE_KEY = 'raspesol:audio-prefs'

export function resultEffectForPrize(prizeLamports) {
  return null
}


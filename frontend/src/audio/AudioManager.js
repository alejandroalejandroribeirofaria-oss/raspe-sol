import { EFFECTS, MUSIC_TRACKS, DEFAULT_MUSIC_TRACK, DEFAULT_PREFS, STORAGE_KEY } from './config.js';

function loadPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage unavailable (private mode, etc.) — prefs just won't persist.
  }
}

/**
 * Every sound in the app goes through here. Components never touch an
 * <audio> element directly — they call audioManager.play('click') and so on.
 *
 * Handles:
 *  - autoplay-policy unlocking on first user gesture
 *  - overlapping one-shot effects (cloned nodes, so two clicks don't cut
 *    each other off)
 *  - looped sounds (scratching, background music) as singleton elements
 *  - lazy-loading anything not marked preload
 *  - a single persisted volume/mute preference shared by everything
 */
class AudioManager {
  constructor() {
    this.prefs = loadPrefs();
    this.unlocked = false;
    this.templates = new Map(); // effect key -> <audio> template element
    this.loopElements = new Map(); // effect key -> live looping <audio> element
    this.musicElement = null;
    this.currentTrack = null;
    this._pendingPreload = [];
  }

  // Call once, as early as possible (e.g. app mount). Actual loading of
  // preload:true effects happens here; playback still waits for unlock().
  init() {
    for (const [key, def] of Object.entries(EFFECTS)) {
      if (def.preload) this._getOrCreateTemplate(key);
    }
  }

  // Browsers block audio before a user gesture. Wire this to the first
  // click/tap anywhere in the app (see useAudioUnlock hook).
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    // Nudge every preloaded template so subsequent .play() calls aren't the
    // "first" one from the browser's point of view.
    for (const el of this.templates.values()) {
      el.play().then(() => el.pause()).catch(() => {});
    }
  }

  _getOrCreateTemplate(key) {
    if (this.templates.has(key)) return this.templates.get(key);
    const def = EFFECTS[key];
    if (!def) return null;
    const el = new Audio(def.src);
    el.preload = 'auto';
    el.volume = this._effectiveVolume();
    this.templates.set(key, el);
    return el;
  }

  _effectiveVolume() {
    return this.prefs.muted ? 0 : this.prefs.volume;
  }

  _applyVolumeToAll() {
    const v = this._effectiveVolume();
    for (const el of this.templates.values()) el.volume = v;
    for (const el of this.loopElements.values()) el.volume = v;
    if (this.musicElement) this.musicElement.volume = v * 0.4; // music sits under effects
  }

  setVolume(level) {
    this.prefs.volume = Math.min(1, Math.max(0, level));
    this.prefs.muted = level === 0;
    savePrefs(this.prefs);
    this._applyVolumeToAll();
  }

  toggleMute() {
    this.prefs.muted = !this.prefs.muted;
    savePrefs(this.prefs);
    this._applyVolumeToAll();
  }

  getPrefs() {
    return { ...this.prefs };
  }

  /** Fire-and-forget one-shot effect. Safe to call rapidly / overlappingly. */
  play(key) {
    if (!this.prefs.sfxEnabled || this.prefs.muted) return;
    const template = this._getOrCreateTemplate(key);
    if (!template) return;
    const node = template.cloneNode();
    node.volume = this._effectiveVolume();
    node.play().catch(() => {
      // Missing file or blocked by autoplay policy — fail silently, never
      // throw from a sound effect call.
    });
  }

  /** Starts a looping effect (e.g. the scratch sound) if not already running. */
  startLoop(key) {
    if (!this.prefs.sfxEnabled || this.prefs.muted) return;
    if (this.loopElements.has(key)) return;
    const def = EFFECTS[key];
    if (!def) return;
    const el = new Audio(def.src);
    el.loop = true;
    el.volume = this._effectiveVolume();
    el.play().catch(() => {});
    this.loopElements.set(key, el);
  }

  stopLoop(key) {
    const el = this.loopElements.get(key);
    if (!el) return;
    el.pause();
    el.currentTime = 0;
    this.loopElements.delete(key);
  }

  startMusic(trackKey = DEFAULT_MUSIC_TRACK) {
    if (!this.prefs.musicEnabled) return;
    const def = MUSIC_TRACKS[trackKey];
    if (!def) return;
    if (this.musicElement && this.currentTrack === trackKey) {
      this.musicElement.play().catch(() => {});
      return;
    }
    this.stopMusic();
    const el = new Audio(def.src);
    el.loop = true;
    el.volume = this._effectiveVolume() * 0.4;
    el.play().catch(() => {});
    this.musicElement = el;
    this.currentTrack = trackKey;
  }

  stopMusic() {
    if (!this.musicElement) return;
    this.musicElement.pause();
    this.musicElement.currentTime = 0;
    this.musicElement = null;
    this.currentTrack = null;
  }

  setMusicEnabled(enabled) {
    this.prefs.musicEnabled = enabled;
    savePrefs(this.prefs);
    if (!enabled) this.stopMusic();
  }

  setSfxEnabled(enabled) {
    this.prefs.sfxEnabled = enabled;
    savePrefs(this.prefs);
  }
}

export const audioManager = new AudioManager();


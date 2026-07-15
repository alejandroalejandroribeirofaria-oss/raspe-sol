import { EFFECTS, MUSIC_TRACKS, DEFAULT_MUSIC_TRACK, DEFAULT_PREFS, STORAGE_KEY } from './config.js';

// Safe check pra não quebrar no servidor
const isBrowser = typeof window!== 'undefined';

function loadPrefs() {
  if (!isBrowser) return {...DEFAULT_PREFS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {...DEFAULT_PREFS };
    return {...DEFAULT_PREFS,...JSON.parse(raw) };
  } catch {
    return {...DEFAULT_PREFS };
  }
}

function savePrefs(prefs) {
  if (!isBrowser) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
}

class AudioManager {
  constructor() {
    this.prefs = loadPrefs();
    this.unlocked = false;
    this.templates = new Map();
    this.loopElements = new Map();
    this.musicElement = null;
    this.currentTrack = null;
  }

  init() {
    if (!isBrowser) return; // <- ESSA LINHA SALVA
    for (const [key, def] of Object.entries(EFFECTS)) {
      if (def.preload) this._getOrCreateTemplate(key);
    }
  }

  unlock() {
    if (!isBrowser || this.unlocked) return;
    this.unlocked = true;
    for (const el of this.templates.values()) {
      el.play().then(() => el.pause()).catch(() => {});
    }
  }

  _getOrCreateTemplate(key) {
    if (!isBrowser) return null;
    if (this.templates.has(key)) return this.templates.get(key);
    const def = EFFECTS[key];
    if (!def) return null;
    try {
      const el = new Audio(def.src);
      el.preload = 'auto';
      el.volume = this._effectiveVolume();
      this.templates.set(key, el);
      return el;
    } catch {
      return null;
    }
  }

  _effectiveVolume() {
    return this.prefs.muted? 0 : this.prefs.volume;
  }

  _applyVolumeToAll() {
    if (!isBrowser) return;
    const v = this._effectiveVolume();
    for (const el of this.templates.values()) el.volume = v;
    for (const el of this.loopElements.values()) el.volume = v;
    if (this.musicElement) this.musicElement.volume = v * 0.4;
  }

  setVolume(level) {
    this.prefs.volume = Math.min(1, Math.max(0, level));
    this.prefs.muted = level === 0;
    savePrefs(this.prefs);
    this._applyVolumeToAll();
  }

  toggleMute() {
    this.prefs.muted =!this.prefs.muted;
    savePrefs(this.prefs);
    this._applyVolumeToAll();
  }

  getPrefs() {
    return {...this.prefs };
  }

  play(key) {
    if (!isBrowser ||!this.prefs.sfxEnabled || this.prefs.muted) return;
    const template = this._getOrCreateTemplate(key);
    if (!template) return;
    try {
      const node = template.cloneNode();
      node.volume = this._effectiveVolume();
      node.play().catch(() => {});
    } catch {}
  }

  startLoop(key) {
    if (!isBrowser ||!this.prefs.sfxEnabled || this.prefs.muted) return;
    if (this.loopElements.has(key)) return;
    const def = EFFECTS[key];
    if (!def) return;
    try {
      const el = new Audio(def.src);
      el.loop = true;
      el.volume = this._effectiveVolume();
      el.play().catch(() => {});
      this.loopElements.set(key, el);
    } catch {}
  }

  stopLoop(key) {
    if (!isBrowser) return;
    const el = this.loopElements.get(key);
    if (!el) return;
    el.pause();
    el.currentTime = 0;
    this.loopElements.delete(key);
  }

  startMusic(trackKey = DEFAULT_MUSIC_TRACK) {
    if (!isBrowser ||!this.prefs.musicEnabled) return;
    const def = MUSIC_TRACKS[trackKey];
    if (!def) return;
    if (this.musicElement && this.currentTrack === trackKey) {
      this.musicElement.play().catch(() => {});
      return;
    }
    this.stopMusic();
    try {
      const el = new Audio(def.src);
      el.loop = true;
      el.volume = this._effectiveVolume() * 0.4;
      el.play().catch(() => {});
      this.musicElement = el;
      this.currentTrack = trackKey;
    } catch {}
  }

  stopMusic() {
    if (!isBrowser ||!this.musicElement) return;
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

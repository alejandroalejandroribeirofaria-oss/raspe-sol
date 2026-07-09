import { audioConfig, AUDIO_STORAGE_KEY } from './config.js';
import { effects } from './effects.js';
import { AmbientMusic } from './music.js';

class AudioManagerImpl {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.effectsGain = null;
    this.musicGain = null;
    this.music = null;
    this.unlocked = false;
    this.scratchNodes = null;
    this.listeners = new Set();
    this.preferences = this.loadPreferences();
  }

  loadPreferences() {
    try {
      const stored = JSON.parse(localStorage.getItem(AUDIO_STORAGE_KEY) || '{}');
      return {
        volume: stored.volume ?? audioConfig.defaultVolume,
        soundEnabled: stored.soundEnabled ?? audioConfig.soundEnabled,
        musicEnabled: stored.musicEnabled ?? audioConfig.musicEnabled,
        musicName: stored.musicName ?? audioConfig.defaultMusic
      };
    } catch {
      return {
        volume: audioConfig.defaultVolume,
        soundEnabled: audioConfig.soundEnabled,
        musicEnabled: audioConfig.musicEnabled,
        musicName: audioConfig.defaultMusic
      };
    }
  }

  savePreferences() {
    localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(this.preferences));
    this.emit();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit() {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  getState() {
    return {
      ...this.preferences,
      unlocked: this.unlocked,
      musicPlaying: Boolean(this.music)
    };
  }

  ensureContext() {
    if (this.context) return this.context;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    this.context = new AudioContextClass();
    this.masterGain = this.context.createGain();
    this.effectsGain = this.context.createGain();
    this.musicGain = this.context.createGain();
    this.effectsGain.connect(this.masterGain);
    this.musicGain.connect(this.masterGain);
    this.masterGain.connect(this.context.destination);
    this.applyVolume();
    return this.context;
  }

  async unlock() {
    const context = this.ensureContext();
    if (!context) return false;
    if (context.state === 'suspended') await context.resume();
    this.unlocked = true;
    this.applyVolume();
    if (this.preferences.musicEnabled) this.startMusic();
    this.emit();
    return true;
  }

  warmUp() {
    if (!this.unlocked) return;
    audioConfig.preloadedEffects.forEach((name) => {
      if (effects[name]) this.play(name, { gain: 0.0001 });
    });
  }

  applyVolume() {
    if (!this.masterGain || !this.effectsGain || !this.musicGain) return;
    const volume = this.preferences.volume;
    this.masterGain.gain.value = volume;
    this.effectsGain.gain.value = this.preferences.soundEnabled ? 1 : 0;
    this.musicGain.gain.value = this.preferences.musicEnabled
      ? audioConfig.musicVolumeRatio
      : 0;
  }

  setVolume(volume) {
    this.preferences.volume = Number(volume);
    this.applyVolume();
    this.savePreferences();
  }

  toggleSound() {
    this.preferences.soundEnabled = !this.preferences.soundEnabled;
    this.applyVolume();
    this.savePreferences();
  }

  toggleMusic() {
    this.preferences.musicEnabled = !this.preferences.musicEnabled;
    this.applyVolume();
    if (this.preferences.musicEnabled) this.startMusic();
    else this.stopMusic();
    this.savePreferences();
  }

  play(name, options = {}) {
    if (!this.preferences.soundEnabled && options.force !== true) return;
    if (!this.unlocked && !options.unlocking) return;
    const context = this.ensureContext();
    const effect = effects[name];
    if (!context || !effect) return;
    const gain = context.createGain();
    gain.gain.value = options.gain ?? 1;
    gain.connect(this.effectsGain);
    effect(context, gain, options);
    window.setTimeout(() => gain.disconnect(), options.cleanupMs || 3500);
  }

  startMusic() {
    if (!this.unlocked || this.music) return;
    const context = this.ensureContext();
    if (!context) return;
    this.music = new AmbientMusic(context, this.musicGain);
    this.music.start();
    this.emit();
  }

  stopMusic() {
    this.music?.stop();
    this.music = null;
    this.emit();
  }

  startScratch(intensity = 0.35) {
    if (!this.unlocked || this.scratchNodes) return;
    const context = this.ensureContext();
    if (!context || !this.preferences.soundEnabled) return;

    const source = context.createBufferSource();
    const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * 0.35;
    }
    source.buffer = buffer;
    source.loop = true;

    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1650;
    filter.Q.value = 1.8;

    const gain = context.createGain();
    gain.gain.value = Math.max(0.015, intensity * 0.08);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.effectsGain);
    source.start();
    this.scratchNodes = { source, filter, gain };
  }

  updateScratch(intensity = 0.35) {
    if (!this.scratchNodes || !this.context) return;
    const safe = Math.max(0.08, Math.min(1, intensity));
    const now = this.context.currentTime;
    this.scratchNodes.gain.gain.setTargetAtTime(safe * 0.085, now, 0.025);
    this.scratchNodes.filter.frequency.setTargetAtTime(900 + safe * 2600, now, 0.025);
  }

  stopScratch() {
    if (!this.scratchNodes) return;
    const { source, gain } = this.scratchNodes;
    try {
      gain.gain.setTargetAtTime(0.0001, this.context.currentTime, 0.02);
      source.stop(this.context.currentTime + 0.05);
      window.setTimeout(() => {
        source.disconnect();
        gain.disconnect();
      }, 120);
    } catch {
      // noop
    }
    this.scratchNodes = null;
  }

  playPrize(prizeLamports) {
    const prize = Number(prizeLamports || 0);
    if (prize <= 0) {
      this.play('lose');
      return;
    }
    if (prize >= 5_000_000_000) this.play('win5', { cleanupMs: 5200 });
    else if (prize >= 2_000_000_000) this.play('win2', { cleanupMs: 4200 });
    else if (prize >= 1_000_000_000) this.play('win1', { cleanupMs: 3600 });
    else this.play('smallWin');
    this.play('confetti');
  }
}

export const AudioManager = new AudioManagerImpl();

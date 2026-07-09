function createNoiseBuffer(context, duration = 0.18) {
  const length = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  }
  return buffer;
}

function envelope(context, destination, { gain = 0.08, attack = 0.006, decay = 0.16 } = {}) {
  const node = context.createGain();
  const now = context.currentTime;
  node.gain.setValueAtTime(0.0001, now);
  node.gain.exponentialRampToValueAtTime(gain, now + attack);
  node.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);
  node.connect(destination);
  return node;
}

function tone(context, destination, frequency, duration, options = {}) {
  const oscillator = context.createOscillator();
  oscillator.type = options.type || 'sine';
  oscillator.frequency.setValueAtTime(frequency, context.currentTime);
  if (options.to) {
    oscillator.frequency.exponentialRampToValueAtTime(options.to, context.currentTime + duration);
  }
  oscillator.connect(envelope(context, destination, {
    gain: options.gain,
    attack: options.attack,
    decay: duration
  }));
  oscillator.start();
  oscillator.stop(context.currentTime + duration + 0.04);
}

function arpeggio(context, destination, notes, options = {}) {
  notes.forEach(([frequency, delay, duration = 0.16], index) => {
    const oscillator = context.createOscillator();
    oscillator.type = options.type || 'triangle';
    oscillator.frequency.setValueAtTime(frequency, context.currentTime + delay);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(options.gain || 0.08, context.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + delay + duration);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(context.currentTime + delay);
    oscillator.stop(context.currentTime + delay + duration + 0.04);
    if (options.sparkle && index % 2 === 0) {
      tone(context, destination, frequency * 2, 0.08, { gain: 0.025, type: 'sine' });
    }
  });
}

function noiseHit(context, destination, options = {}) {
  const source = context.createBufferSource();
  source.buffer = createNoiseBuffer(context, options.duration || 0.2);
  const filter = context.createBiquadFilter();
  filter.type = options.filterType || 'highpass';
  filter.frequency.setValueAtTime(options.frequency || 1200, context.currentTime);
  source.connect(filter);
  filter.connect(envelope(context, destination, {
    gain: options.gain || 0.035,
    attack: options.attack || 0.004,
    decay: options.duration || 0.2
  }));
  source.start();
}

export const effects = {
  buttonClick(context, destination) {
    tone(context, destination, 520, 0.075, { gain: 0.045, type: 'triangle', to: 760 });
  },
  buttonHover(context, destination) {
    tone(context, destination, 880, 0.045, { gain: 0.018, type: 'sine', to: 1180 });
  },
  windowOpen(context, destination) {
    arpeggio(context, destination, [[420, 0], [630, 0.045], [930, 0.09]], { gain: 0.045 });
  },
  windowClose(context, destination) {
    arpeggio(context, destination, [[720, 0], [520, 0.04], [340, 0.08]], { gain: 0.04, type: 'sine' });
  },
  purchaseStarted(context, destination) {
    arpeggio(context, destination, [[360, 0], [490, 0.06], [680, 0.12]], { gain: 0.052 });
    noiseHit(context, destination, { duration: 0.12, gain: 0.016, frequency: 2200 });
  },
  purchaseCompleted(context, destination) {
    arpeggio(context, destination, [[520, 0], [780, 0.06], [1040, 0.12], [1560, 0.18]], { gain: 0.075 });
  },
  walletConnect(context, destination) {
    arpeggio(context, destination, [[392, 0], [587, 0.06], [784, 0.12]], { gain: 0.06 });
  },
  walletDisconnect(context, destination) {
    arpeggio(context, destination, [[620, 0], [410, 0.055], [260, 0.11]], { gain: 0.042, type: 'sine' });
  },
  paymentConfirmed(context, destination) {
    arpeggio(context, destination, [[660, 0], [880, 0.07], [1320, 0.14]], { gain: 0.07, sparkle: true });
  },
  paymentError(context, destination) {
    tone(context, destination, 180, 0.22, { gain: 0.075, type: 'sawtooth', to: 120 });
    noiseHit(context, destination, { duration: 0.16, gain: 0.03, frequency: 480 });
  },
  lose(context, destination) {
    tone(context, destination, 260, 0.16, { gain: 0.045, type: 'triangle', to: 190 });
  },
  smallWin(context, destination) {
    arpeggio(context, destination, [[700, 0], [940, 0.06], [1260, 0.12]], { gain: 0.065 });
  },
  win1(context, destination) {
    arpeggio(context, destination, [[520, 0], [660, 0.07], [880, 0.14], [1320, 0.22]], { gain: 0.085, sparkle: true });
  },
  win2(context, destination) {
    arpeggio(context, destination, [[440, 0], [660, 0.08], [880, 0.16], [1100, 0.24], [1760, 0.34]], { gain: 0.095, sparkle: true });
  },
  win5(context, destination) {
    arpeggio(context, destination, [
      [330, 0, 0.28],
      [495, 0.13, 0.28],
      [660, 0.26, 0.34],
      [990, 0.44, 0.44],
      [1320, 0.64, 0.52],
      [1980, 0.92, 0.62]
    ], { gain: 0.11, sparkle: true });
    noiseHit(context, destination, { duration: 0.9, gain: 0.035, frequency: 3800 });
  },
  confetti(context, destination) {
    for (let i = 0; i < 9; i += 1) {
      tone(context, destination, 900 + Math.random() * 1600, 0.08, {
        gain: 0.02,
        type: 'sine',
        attack: 0.004
      });
    }
  },
  adminConfirm(context, destination) {
    arpeggio(context, destination, [[480, 0], [720, 0.08], [960, 0.16]], { gain: 0.055 });
  },
  alert(context, destination) {
    tone(context, destination, 240, 0.12, { gain: 0.065, type: 'square' });
    setTimeout(() => tone(context, destination, 210, 0.16, { gain: 0.06, type: 'square' }), 110);
  }
};

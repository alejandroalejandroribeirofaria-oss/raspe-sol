import { useEffect } from 'react';
import { audioManager } from '../audio/AudioManager.js';

export function useAudioBoot() {
  useEffect(() => {
    audioManager.init();
    const unlock = () => {
      audioManager.unlock();
      audioManager.startMusic();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);
}

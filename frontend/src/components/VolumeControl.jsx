import { useState } from 'react';
import { audioManager } from '../audio/AudioManager.js';
import { VOLUME_PRESETS } from '../audio/config.js';

function volumeIcon(volume, muted) {
  if (muted || volume === 0) return 'ðŸ”‡';
  if (volume <= 0.25) return 'ðŸ”ˆ';
  if (volume <= 0.5) return 'ðŸ”‰';
  return 'ðŸ”Š';
}

export default function VolumeControl() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(audioManager.getPrefs());

  const toggle = () => {
    audioManager.play(open ? 'windowClose' : 'windowOpen');
    setOpen((o) => !o);
  };

  const pick = (level) => {
    audioManager.setVolume(level);
    setPrefs(audioManager.getPrefs());
    audioManager.play('click');
    setOpen(false);
  };

  return (
    <div className="volume-control">
      <button
        className="volume-control__toggle"
        onClick={toggle}
        aria-label="Volume"
        aria-expanded={open}
      >
        {volumeIcon(prefs.volume, prefs.muted)}
      </button>
      {open && (
        <div className="volume-control__menu">
          {VOLUME_PRESETS.map((level) => (
            <button
              key={level}
              className={`volume-control__item ${prefs.volume === level && !prefs.muted ? 'is-active' : ''}`}
              onClick={() => pick(level)}
            >
              {level === 0 ? 'Mudo' : `${Math.round(level * 100)}%`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

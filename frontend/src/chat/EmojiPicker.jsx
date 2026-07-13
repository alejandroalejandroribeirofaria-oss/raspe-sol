import { useState } from 'react';
import { EMOJI_CATEGORIES } from './emojiData.js';

export default function EmojiPicker({ onPick, onClose }) {
  const [category, setCategory] = useState(EMOJI_CATEGORIES[0].key);
  const active = EMOJI_CATEGORIES.find((c) => c.key === category);

  return (
    <div className="emoji-picker" role="dialog" aria-label="Emoji picker">
      <div className="emoji-picker__tabs">
        {EMOJI_CATEGORIES.map((c) => (
          <button
            key={c.key}
            className={`emoji-picker__tab ${category === c.key ? 'is-active' : ''}`}
            onClick={() => setCategory(c.key)}
          >
            {c.label}
          </button>
        ))}
        <button className="emoji-picker__close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <div className="emoji-picker__grid">
        {active.emoji.map((e) => (
          <button key={e} className="emoji-picker__item" onClick={() => onPick(e)}>
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}


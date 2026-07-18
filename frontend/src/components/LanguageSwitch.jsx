import { useI18n } from '../i18n/I18nProvider'  // 1. IMPORTA O HOOK
import { audioManager } from '../audio/AudioManager.js';

const LANGUAGES = [  // 2. DECLARA AS LINGUAS
  { code: 'pt', label: 'PT' },
  { code: 'en', label: 'EN' },
  { code: 'zh', label: '中文' },
];

export default function LanguageSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <div className="lang-switch" role="group" aria-label="Language">
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          className={`lang-switch__btn ${lang === l.code ? 'is-active' : ''}`}
          onClick={() => {
            audioManager.play('click');
            setLang(l.code);
          }}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

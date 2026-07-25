import { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function LanguageSwitcher({ className = '' }) {
  const { lang, setLang, languages } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const current = languages.find((l) => l.code === lang);

  return (
    <div className={`relative shrink-0 ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Language"
        title="Language"
        className="glass w-10 h-10 rounded-full flex items-center justify-center text-ink relative"
      >
        <Globe size={17} />
      </button>
      {open && (
        <div className="absolute top-12 end-0 z-30 glass-strong rounded-2xl shadow-lift py-1.5 min-w-[140px] animate-pop-in">
          {languages.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              className={`w-full text-start px-4 py-2 text-sm font-medium transition-colors ${
                l.code === lang ? 'text-accent-700 font-bold' : 'text-ink/70 hover:text-ink'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

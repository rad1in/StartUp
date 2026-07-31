import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

// Sticky, scroll-spying category bar for the menu page. As the customer scrolls,
// the pill for the section currently in view highlights and auto-centers; tapping
// a pill smooth-scrolls to that section. Makes long menus (dozens of categories)
// navigable instead of an endless wall of items.
export default function MenuCategoryNav({ sections }) {
  const { n } = useLanguage();
  const [active, setActive] = useState(sections[0]?.id);
  const navRef = useRef(null);
  const clickLock = useRef(false);

  useEffect(() => {
    if (sections.length === 0) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (clickLock.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id.replace('menu-sec-', ''));
      },
      // Activate a section once its top passes just under the sticky bar, and
      // keep it active until the next one takes over.
      { rootMargin: '-150px 0px -65% 0px', threshold: 0 }
    );
    sections.forEach((s) => {
      const el = document.getElementById(`menu-sec-${s.id}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  // Keep the active pill centered in the horizontal nav.
  useEffect(() => {
    const pill = navRef.current?.querySelector(`[data-cat="${active}"]`);
    pill?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [active]);

  const go = (id) => {
    setActive(id);
    clickLock.current = true;
    const el = document.getElementById(`menu-sec-${id}`);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
    // Release the scroll-spy lock after the smooth scroll settles.
    setTimeout(() => {
      clickLock.current = false;
    }, 700);
  };

  if (sections.length === 0) return null;

  return (
    <div
      ref={navRef}
      className="no-scrollbar sticky z-10 -mx-4 px-4 py-2.5 mb-5 flex gap-2 overflow-x-auto bg-surface-2/70 backdrop-blur-xl border-b border-ink/10"
      style={{ top: '58px' }}
    >
      {sections.map((s) => (
        <button
          key={s.id}
          data-cat={s.id}
          onClick={() => go(s.id)}
          className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold transition-all active:scale-95 ${
            active === s.id
              ? 'bg-gradient-to-b from-primary-700 to-primary-900 text-white shadow-button ring-1 ring-accent-300/60'
              : 'bg-surface-2/60 text-ink/55 hover:text-ink hover:bg-white'
          }`}
        >
          {s.name}
          {s.count != null && (
            <span className={`mr-1.5 text-[10px] ${active === s.id ? 'text-accent-200' : 'text-ink/30'}`}>
              {n(s.count)}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

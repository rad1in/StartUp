import { NavLink, useLocation } from 'react-router-dom';
import { Home, Coffee, QrCode, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';

// Floating bottom navigation for phones — the QR scan action sits raised in the
// middle. Hidden on desktop and inside the venue/admin panels (they have their
// own navigation and this bar would cover their content).
export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();

  if (location.pathname.startsWith('/venue') || location.pathname.startsWith('/admin')) return null;

  const accountTo = user ? '/account' : '/login';
  const accountLabel = user ? t('bottomNav.account') : t('bottomNav.login');

  const side = [
    { to: '/', label: t('bottomNav.home'), icon: Home, end: true },
    { to: '/cafes', label: t('bottomNav.cafes'), icon: Coffee },
  ];

  const itemClass = ({ isActive }) =>
    `flex flex-col items-center gap-0.5 px-3 py-1 rounded-2xl text-[10px] font-bold transition-all ${
      isActive ? 'text-accent-700' : 'text-ink/45 hover:text-ink'
    }`;

  return (
    <nav className="md:hidden fixed bottom-3 inset-x-0 z-30 flex justify-center pointer-events-none">
      <div className="pointer-events-auto glass-strong rounded-full shadow-lift px-3 py-2 flex items-end gap-1">
        {side.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={itemClass}>
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Raised center action — scan a table QR. */}
        <NavLink to="/scan" className="flex flex-col items-center gap-0.5 px-2 -mt-7">
          {({ isActive }) => (
            <>
              <span
                className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-accent-glow transition-transform active:scale-90 ${
                  isActive
                    ? 'bg-gradient-to-b from-accent-500 to-accent-700'
                    : 'bg-gradient-to-b from-accent-400 to-accent-600'
                }`}
              >
                <QrCode size={24} />
              </span>
              <span className={`text-[10px] font-bold ${isActive ? 'text-accent-700' : 'text-ink/45'}`}>{t('bottomNav.scan')}</span>
            </>
          )}
        </NavLink>

        <NavLink to={accountTo} end className={itemClass}>
          {({ isActive }) => (
            <>
              <User size={20} strokeWidth={isActive ? 2.4 : 2} />
              <span>{accountLabel}</span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
}

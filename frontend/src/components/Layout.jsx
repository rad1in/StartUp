import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCustomerSocket } from '../hooks/useCustomerSocket';
import { useLanguage } from '../context/LanguageContext';
import { Coffee, Menu, X } from 'lucide-react';
import api from '../services/api';
import Button from './Button';
import BottomNav from './BottomNav';
import InstallPrompt from './InstallPrompt';
import ImpersonationBanner from './ImpersonationBanner';
import SocialLinks from './SocialLinks';
import CityPicker from './CityPicker';
import ThemeToggle from './ThemeToggle';
import LanguageSwitcher from './LanguageSwitcher';

export default function Layout() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (user?.role === 'CUSTOMER') {
      api.get('/notifications').then(({ data }) => setUnreadCount(data.filter((n) => !n.isRead).length));
    }
  }, [user]);

  // Close the mobile menu whenever the route changes.
  useEffect(() => setMenuOpen(false), [location.pathname]);

  useCustomerSocket(user?.role === 'CUSTOMER' ? user.id : null, {
    'notification:new': () => setUnreadCount((prev) => prev + 1),
  });

  const navLinks = [
    { to: '/cafes', label: t('nav.cafes') },
    { to: '/pricing', label: t('nav.pricing') },
  ];
  if (user) {
    if (user.role === 'CUSTOMER') navLinks.push({ to: '/account/notifications', label: t('nav.notifications'), badge: unreadCount });
    navLinks.push({ to: '/account', label: t('nav.account') });
    if (user.role === 'VENUE_OWNER' || user.role === 'VENUE_STAFF') navLinks.push({ to: '/venue', label: t('nav.venuePanel') });
    if (['SUPER_ADMIN', 'SUPPORT_STAFF', 'FINANCE_STAFF'].includes(user.role))
      navLinks.push({ to: '/admin', label: t('nav.adminPanel') });
  }

  const linkClass = ({ isActive }) =>
    `relative py-1 transition-colors font-medium after:absolute after:right-0 after:-bottom-0.5 after:h-[3px] after:rounded-full after:bg-gradient-to-l after:from-accent-400 after:to-accent-600 after:transition-all after:duration-300 ${
      isActive ? 'text-ink after:w-full' : 'text-ink/60 hover:text-ink after:w-0 hover:after:w-full'
    }`;

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Fixed, blurred grayscale glows — purely decorative depth behind the glass surfaces. */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-black/[0.04] blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-[28rem] h-[28rem] rounded-full bg-black/[0.03] blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 rounded-full bg-white/60 blur-3xl" />
      </div>

      <header className="sticky top-0 z-20 bg-surface-2/60 backdrop-blur-xl border-b border-ink/10 shadow-[0_2px_20px_rgba(20,18,16,0.04)]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 shrink-0 min-w-0">
            <Link to="/" className="group flex items-center gap-2.5 shrink-0">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-700 to-primary-900 text-white flex items-center justify-center shadow-button transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105">
                <Coffee size={18} className="text-accent-300" />
              </span>
              <span className="text-lg font-extrabold text-ink leading-none">ET-Cafe</span>
            </Link>
            <span className="w-px h-6 bg-ink/10" />
            <CityPicker />
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-5 text-sm">
            {navLinks.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.to === '/account'} className={linkClass}>
                {link.label}
                {link.badge > 0 && (
                  <span className="absolute -top-2 -left-3 bg-gradient-to-b from-accent-400 to-accent-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-accent-glow">
                    {link.badge > 9 ? '9+' : link.badge}
                  </span>
                )}
              </NavLink>
            ))}
            <LanguageSwitcher />
            <ThemeToggle />
            {user ? (
              <Button variant="ghost" onClick={logout}>
                {t('nav.logout')}
              </Button>
            ) : (
              <Link to="/login">
                <Button variant="secondary">{t('nav.login')}</Button>
              </Link>
            )}
          </nav>

          {/* Mobile hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="glass w-10 h-10 rounded-full flex items-center justify-center text-ink relative"
              aria-label="منو"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
              {!menuOpen && unreadCount > 0 && (
                <span className="absolute -top-1 -left-1 bg-gradient-to-b from-accent-400 to-accent-600 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-ink/10 glass-strong">
            <nav className="max-w-5xl mx-auto px-4 py-3 flex flex-col gap-1 text-sm">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/account'}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-colors ${
                      isActive ? 'bg-gradient-to-b from-primary-700 to-primary-900 text-white shadow-button' : 'text-ink/70 hover:bg-black/5'
                    }`
                  }
                >
                  <span>{link.label}</span>
                  {link.badge > 0 && (
                    <span className="bg-gradient-to-b from-accent-400 to-accent-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                      {link.badge > 9 ? '9+' : link.badge}
                    </span>
                  )}
                </NavLink>
              ))}
              <div className="pt-2">
                {user ? (
                  <Button variant="danger" onClick={logout} className="w-full">
                    {t('nav.logout')}
                  </Button>
                ) : (
                  <Link to="/login" className="block">
                    <Button variant="primary" className="w-full">
                      {t('nav.login')}
                    </Button>
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 pb-28 md:pb-8">
        <Outlet />
      </main>
      <footer className="mt-10 border-t border-black/5 bg-surface-2/40 backdrop-blur-sm pb-24 md:pb-0">
        <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col items-center gap-5">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-700 to-primary-900 text-accent-300 flex items-center justify-center">
              <Coffee size={15} />
            </span>
            <div className="leading-tight">
              <p className="font-extrabold text-ink text-sm">ET-Cafe</p>
              <p className="text-[11px] text-ink/40">{t('footer.tagline')}</p>
            </div>
          </div>
          <SocialLinks />
          <div className="flex items-center gap-4 text-xs text-ink/50">
            <Link to="/terms" className="hover:text-ink transition-colors">{t('footer.terms')}</Link>
            <Link to="/privacy" className="hover:text-ink transition-colors">{t('footer.privacy')}</Link>
          </div>
          <p className="text-xs text-ink/50">
            {t('footer.madeBy')}{' '}
            <a
              href="https://rradin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink font-bold hover:text-accent-600 transition-colors"
            >
              رادین رفعت‌پناه
            </a>{' '}
            | © ۱۴۰۴
          </p>
        </div>
      </footer>

      <BottomNav />
      <InstallPrompt />
      <ImpersonationBanner />
    </div>
  );
}

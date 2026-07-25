import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'حالت روشن' : 'حالت تیره'}
      title={isDark ? 'حالت روشن' : 'حالت تیره'}
      className={`glass w-10 h-10 rounded-full flex items-center justify-center text-ink shrink-0 transition-transform active:scale-90 ${className}`}
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}

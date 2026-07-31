import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

// items: [{ label, to? }] — last item (no `to`) renders as the current page.
export default function Breadcrumb({ items }) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-ink/50 mb-3 flex-wrap" aria-label="مسیر">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronLeft size={12} className="text-ink/25" />}
          {item.to ? (
            <Link to={item.to} className="hover:text-ink transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-ink font-bold">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

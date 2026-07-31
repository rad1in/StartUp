import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

const STORAGE_KEY = 'activeBranch';

export function getActiveBranch() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}

export function setActiveBranch(venue) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(venue));
}

export default function BranchSwitcher({ onBranchChange }) {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [active, setActive] = useState(getActiveBranch);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (user?.role !== 'VENUE_OWNER') return;
    api.get('/brands').then(({ data }) => {
      const allVenues = data.flatMap((b) => (b.venues || []).map((v) => ({ ...v, brandName: b.name })));
      setBranches(allVenues);
      if (allVenues.length > 0 && !active) {
        const first = allVenues.find((v) => v.id === user.venueId) || allVenues[0];
        setActive(first);
        setActiveBranch(first);
        onBranchChange?.(first);
      }
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!branches.length || user?.role !== 'VENUE_OWNER') return null;

  function select(venue) {
    setActive(venue);
    setActiveBranch(venue);
    setOpen(false);
    onBranchChange?.(venue);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-700 transition-colors"
      >
        <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
        <span className="font-medium truncate max-w-32">{active?.name || 'انتخاب شعبه'}</span>
        <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-100 z-50 py-1 overflow-hidden">
          {branches.map((b) => (
            <button
              key={b.id}
              onClick={() => select(b)}
              className={`w-full text-right px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 ${active?.id === b.id ? 'bg-primary-50 text-primary-700' : 'text-gray-700'}`}
            >
              {active?.id === b.id && <span className="w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" />}
              <div className="text-right">
                <p className="font-medium">{b.name}</p>
                {b.brandName && <p className="text-xs text-gray-400">{b.brandName}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

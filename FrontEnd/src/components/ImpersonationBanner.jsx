import { useNavigate } from 'react-router-dom';
import { UserCog, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

// Fixed banner shown for as long as an admin is impersonating a venue owner
// — always visible so it's never ambiguous whose account is acting. "پایان و
// بازگشت" restores the admin's own session (see AuthContext.endImpersonation).
export default function ImpersonationBanner() {
  const { impersonation, endImpersonation } = useAuth();
  const navigate = useNavigate();

  if (!impersonation) return null;

  async function end() {
    await endImpersonation();
    navigate('/admin');
  }

  return (
    <div className="fixed top-0 inset-x-0 z-[60] bg-gradient-to-l from-primary-900 to-primary-700 text-white text-sm px-4 py-2 flex items-center justify-center gap-3 shadow-lg">
      <UserCog size={16} className="text-accent-300 shrink-0" />
      <span>
        در حال جانشینی <b>{impersonation.ownerName}</b> از مجموعه <b>{impersonation.venueName}</b>
      </span>
      <button
        onClick={end}
        className="inline-flex items-center gap-1 bg-white/15 hover:bg-white/25 rounded-full px-3 py-1 text-xs font-bold transition-colors"
      >
        <LogOut size={12} />
        پایان و بازگشت
      </button>
    </div>
  );
}

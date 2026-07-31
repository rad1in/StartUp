import { useEffect, useState } from 'react';
import { Gift, Copy, Check } from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/Card';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';

export default function Referral() {
  const toast = useToast();
  const { t, n } = useLanguage();
  const [info, setInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get('/referral/me').then(({ data }) => setInfo(data));
  }, []);

  if (!info) {
    return <div className="skeleton h-48 rounded-2xl" />;
  }

  const link = `${window.location.origin}/register?ref=${info.code}`;

  function copyLink() {
    navigator.clipboard?.writeText(link);
    setCopied(true);
    toast.success(t('referral.linkCopied'));
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <Card className="text-center py-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 text-white flex items-center justify-center mx-auto mb-4 shadow-accent-glow">
          <Gift size={28} />
        </div>
        <h2 className="text-lg font-black text-ink mb-1">{t('referral.inviteTitle')}</h2>
        <p className="text-sm text-ink/50 max-w-xs mx-auto">
          {t('referral.descPrefix')}{' '}
          <b className="text-ink">{n(Number(info.rewardAmount))} {t('menu.toman')}</b> {t('referral.descSuffix')}
        </p>

        <div className="mt-6 flex items-center gap-2 max-w-sm mx-auto">
          <input readOnly value={link} className="glass-input flex-1 rounded-xl px-3 py-2.5 text-xs text-left" dir="ltr" />
          <button
            type="button"
            onClick={copyLink}
            className="shrink-0 w-11 h-11 rounded-xl bg-accent-500 hover:bg-accent-600 text-white flex items-center justify-center transition-colors"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 gap-3">
        <Card className="text-center py-5">
          <p className="text-2xl font-black text-accent-600">{n(info.completedCount)}</p>
          <p className="text-xs text-ink/50 mt-1">{t('referral.successfulInvites')}</p>
        </Card>
        <Card className="text-center py-5">
          <p className="text-2xl font-black text-accent-600">{n(info.totalEarned)} {t('referral.tomanShort')}</p>
          <p className="text-xs text-ink/50 mt-1">{t('referral.totalEarned')}</p>
        </Card>
      </div>

      {info.referrals.length > 0 && (
        <Card>
          <h3 className="font-bold text-ink text-sm mb-3">{t('referral.invitedFriends')}</h3>
          <div className="space-y-2">
            {info.referrals.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm border-b border-ink/5 last:border-0 pb-2">
                <span className="text-ink/70">{r.refereeName}</span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    r.status === 'COMPLETED' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {r.status === 'COMPLETED' ? t('referral.statusCompleted') : t('referral.statusPending')}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { SkeletonRows } from '../../components/SkeletonBlock';

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} کیلوبایت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} مگابایت`;
}

export default function DbBackup() {
  const toast = useToast();
  const confirm = useConfirm();
  const [backups, setBackups] = useState(null);
  const [creating, setCreating] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState('');
  const [restoring, setRestoring] = useState(false);

  async function refresh() {
    const { data } = await api.get('/admin/db-backup');
    setBackups(data);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function createBackup() {
    setCreating(true);
    try {
      await api.post('/admin/db-backup');
      toast.success('نسخه پشتیبان جدید ساخته شد.');
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'ساخت نسخه پشتیبان ناموفق بود.');
    } finally {
      setCreating(false);
    }
  }

  function downloadBackup(filename) {
    window.open(`${api.defaults.baseURL}/admin/db-backup/${filename}/download`, '_blank', 'noopener,noreferrer');
  }

  async function deleteBackup(filename) {
    if (!(await confirm(`نسخه پشتیبان «${filename}» برای همیشه حذف شود؟`, { danger: true }))) return;
    await api.delete(`/admin/db-backup/${filename}`);
    toast.success('نسخه پشتیبان حذف شد.');
    refresh();
  }

  async function runRestore() {
    if (restoreConfirmText !== restoreTarget) {
      toast.error('نام فایل را دقیقا مطابق بنویسید تا بازیابی فعال شود.');
      return;
    }
    setRestoring(true);
    try {
      await api.post(`/admin/db-backup/${restoreTarget}/restore`);
      toast.success('بازیابی با موفقیت انجام شد. تمام داده‌های فعلی با این نسخه جایگزین شدند.');
      setRestoreTarget(null);
      setRestoreConfirmText('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'بازیابی ناموفق بود.');
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-ink text-lg">پشتیبان‌گیری خودکار دیتابیس</h2>
          <p className="text-sm text-ink/50 mt-1">
            یک نسخه پشتیبان به‌صورت خودکار هر ۲۴ ساعت ساخته می‌شود؛ حداکثر ۱۴ نسخه اخیر نگه‌داری می‌شود.
          </p>
        </div>
        <Button onClick={createBackup} disabled={creating}>
          {creating ? 'در حال ساخت...' : 'ساخت نسخه پشتیبان جدید'}
        </Button>
      </div>

      <Card>
        <h3 className="font-semibold text-ink mb-3">نسخه‌های پشتیبان</h3>
        {!backups ? (
          <SkeletonRows rows={4} />
        ) : backups.length === 0 ? (
          <p className="text-ink/40 text-sm">هنوز نسخه پشتیبانی ساخته نشده است.</p>
        ) : (
          <div className="space-y-2">
            {backups.map((b) => (
              <div key={b.filename} className="flex items-center justify-between border border-ink/10 rounded-lg px-3 py-2 flex-wrap gap-2">
                <div>
                  <p className="text-sm font-medium text-ink">{b.filename}</p>
                  <p className="text-xs text-ink/40">
                    {new Date(b.createdAt).toLocaleString('fa-IR')} — {formatSize(b.sizeBytes)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => downloadBackup(b.filename)}>
                    دانلود
                  </Button>
                  <Button variant="ghost" onClick={() => { setRestoreTarget(b.filename); setRestoreConfirmText(''); }}>
                    بازیابی
                  </Button>
                  <Button variant="danger" onClick={() => deleteBackup(b.filename)}>
                    حذف
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {restoreTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setRestoreTarget(null)}>
          <div className="glass-strong rounded-2xl shadow-lift w-full max-w-md p-5 animate-pop-in" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-black text-ink mb-2">بازیابی نسخه پشتیبان — عملیات غیرقابل بازگشت</h3>
            <p className="text-sm text-ink/60 mb-3">
              با بازیابی «{restoreTarget}»، تمام داده‌های فعلی دیتابیس (سفارش‌ها، مشتریان، مجموعه‌ها و ...) با محتوای این نسخه
              پشتیبان جایگزین می‌شود و قابل بازگشت نیست. برای تایید، نام فایل را دقیقا در کادر زیر بنویسید.
            </p>
            <input
              className="border border-ink/10 bg-transparent rounded-lg px-3 py-2 text-sm w-full mb-3"
              placeholder={restoreTarget}
              value={restoreConfirmText}
              onChange={(e) => setRestoreConfirmText(e.target.value)}
              dir="ltr"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setRestoreTarget(null)}>
                انصراف
              </Button>
              <Button variant="danger" onClick={runRestore} disabled={restoring || restoreConfirmText !== restoreTarget}>
                {restoring ? 'در حال بازیابی...' : 'بازیابی قطعی'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

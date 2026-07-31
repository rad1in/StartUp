import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useLanguage } from '../../context/LanguageContext';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { SkeletonRows } from '../../components/SkeletonBlock';

export default function DbBackup() {
  const { t, date } = useLanguage();
  const toast = useToast();
  const confirm = useConfirm();
  const [backups, setBackups] = useState(null);
  const [creating, setCreating] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState('');
  const [restoring, setRestoring] = useState(false);

  function formatSize(bytes) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${t('admin.dbBackup.kilobytes')}`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} ${t('admin.dbBackup.megabytes')}`;
  }

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
      toast.success(t('admin.dbBackup.backupCreated'));
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || t('admin.dbBackup.backupCreateFailed'));
    } finally {
      setCreating(false);
    }
  }

  function downloadBackup(filename) {
    window.open(`${api.defaults.baseURL}/admin/db-backup/${filename}/download`, '_blank', 'noopener,noreferrer');
  }

  async function deleteBackup(filename) {
    if (!(await confirm(`${t('admin.dbBackup.deleteBackupConfirmPrefix')} «${filename}» ${t('admin.dbBackup.deleteBackupConfirmSuffix')}`, { danger: true }))) return;
    await api.delete(`/admin/db-backup/${filename}`);
    toast.success(t('admin.dbBackup.backupDeleted'));
    refresh();
  }

  async function runRestore() {
    if (restoreConfirmText !== restoreTarget) {
      toast.error(t('admin.dbBackup.filenameMismatchError'));
      return;
    }
    setRestoring(true);
    try {
      await api.post(`/admin/db-backup/${restoreTarget}/restore`);
      toast.success(t('admin.dbBackup.restoreSuccess'));
      setRestoreTarget(null);
      setRestoreConfirmText('');
    } catch (err) {
      toast.error(err.response?.data?.message || t('admin.dbBackup.restoreFailed'));
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-ink text-lg">{t('admin.dbBackup.title')}</h2>
          <p className="text-sm text-ink/50 mt-1">
            {t('admin.dbBackup.subtitle')}
          </p>
        </div>
        <Button onClick={createBackup} disabled={creating}>
          {creating ? t('admin.dbBackup.creating') : t('admin.dbBackup.createNewBackup')}
        </Button>
      </div>

      <Card>
        <h3 className="font-semibold text-ink mb-3">{t('admin.dbBackup.backupsListTitle')}</h3>
        {!backups ? (
          <SkeletonRows rows={4} />
        ) : backups.length === 0 ? (
          <p className="text-ink/40 text-sm">{t('admin.dbBackup.noBackupsYet')}</p>
        ) : (
          <div className="space-y-2">
            {backups.map((b) => (
              <div key={b.filename} className="flex items-center justify-between border border-ink/10 rounded-lg px-3 py-2 flex-wrap gap-2">
                <div>
                  <p className="text-sm font-medium text-ink">{b.filename}</p>
                  <p className="text-xs text-ink/40">
                    {date(b.createdAt)} — {formatSize(b.sizeBytes)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => downloadBackup(b.filename)}>
                    {t('common.download')}
                  </Button>
                  <Button variant="ghost" onClick={() => { setRestoreTarget(b.filename); setRestoreConfirmText(''); }}>
                    {t('admin.dbBackup.restore')}
                  </Button>
                  <Button variant="danger" onClick={() => deleteBackup(b.filename)}>
                    {t('common.delete')}
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
            <h3 className="font-black text-ink mb-2">{t('admin.dbBackup.restoreModalTitle')}</h3>
            <p className="text-sm text-ink/60 mb-3">
              {t('admin.dbBackup.restoreModalWarningPrefix')} «{restoreTarget}»{t('admin.dbBackup.restoreModalWarningSuffix')}
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
                {t('common.cancel')}
              </Button>
              <Button variant="danger" onClick={runRestore} disabled={restoring || restoreConfirmText !== restoreTarget}>
                {restoring ? t('admin.dbBackup.restoring') : t('admin.dbBackup.confirmRestore')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { SkeletonRows } from '../../components/SkeletonBlock';

export default function ContentCenter() {
  const toast = useToast();
  const confirm = useConfirm();
  const [venues, setVenues] = useState(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());

  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [pricePercent, setPricePercent] = useState('');
  const [itemNameContains, setItemNameContains] = useState('');
  const [itemAvailable, setItemAvailable] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/admin/venues').then(({ data }) => setVenues(data));
  }, []);

  const filtered = (venues || []).filter((v) => v.name.includes(search) || v.city?.includes(search));
  const selectedIds = [...selected];

  function toggleVenue(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (filtered.every((v) => selected.has(v.id))) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((v) => next.delete(v.id));
        return next;
      });
    } else {
      setSelected((prev) => new Set([...prev, ...filtered.map((v) => v.id)]));
    }
  }

  async function requireSelection() {
    if (selectedIds.length === 0) {
      toast.error('حداقل یک مجموعه را انتخاب کنید.');
      return false;
    }
    return confirm(`این عملیات روی ${selectedIds.length.toLocaleString('fa-IR')} مجموعه اعمال می‌شود. ادامه می‌دهید؟`, {
      title: 'تایید ویرایش گروهی',
    });
  }

  async function runFindReplace() {
    if (!findText) return toast.error('متن جستجو را وارد کنید.');
    if (!(await requireSelection())) return;
    setBusy(true);
    try {
      const { data } = await api.patch('/admin/content-center/venues/description', {
        venueIds: selectedIds,
        find: findText,
        replace: replaceText,
      });
      toast.success(`توضیحات ${data.affected.toLocaleString('fa-IR')} مجموعه از ${data.matched.toLocaleString('fa-IR')} مورد یافت‌شده به‌روزرسانی شد.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'ویرایش گروهی ناموفق بود.');
    } finally {
      setBusy(false);
    }
  }

  async function runStatusChange(field, value) {
    if (!(await requireSelection())) return;
    setBusy(true);
    try {
      const { data } = await api.patch('/admin/content-center/venues/status', {
        venueIds: selectedIds,
        [field]: value,
      });
      toast.success(`وضعیت ${data.affected.toLocaleString('fa-IR')} مجموعه به‌روزرسانی شد.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'به‌روزرسانی ناموفق بود.');
    } finally {
      setBusy(false);
    }
  }

  async function runPriceAdjust() {
    if (pricePercent === '' || Number.isNaN(Number(pricePercent))) return toast.error('درصد معتبر وارد کنید.');
    if (!(await requireSelection())) return;
    setBusy(true);
    try {
      const { data } = await api.patch('/admin/content-center/menu/prices', {
        venueIds: selectedIds,
        percent: Number(pricePercent),
      });
      toast.success(`قیمت ${data.affected.toLocaleString('fa-IR')} آیتم منو تعدیل شد.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'تعدیل قیمت ناموفق بود.');
    } finally {
      setBusy(false);
    }
  }

  async function runAvailability() {
    if (!itemNameContains) return toast.error('نام آیتم را وارد کنید.');
    if (!(await requireSelection())) return;
    setBusy(true);
    try {
      const { data } = await api.patch('/admin/content-center/menu/availability', {
        venueIds: selectedIds,
        itemNameContains,
        isAvailable: itemAvailable,
      });
      toast.success(`وضعیت موجودی ${data.affected.toLocaleString('fa-IR')} آیتم تغییر کرد.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'به‌روزرسانی ناموفق بود.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bold text-ink text-lg">مدیریت متمرکز محتوای مجموعه‌ها</h2>
        <p className="text-sm text-ink/50 mt-1">اعمال یک تغییر روی چند مجموعه هم‌زمان، بدون ورود جداگانه به هر پنل.</p>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-ink">انتخاب مجموعه‌ها</h3>
          <span className="text-xs text-ink/50">{selectedIds.length.toLocaleString('fa-IR')} مورد انتخاب شده</span>
        </div>
        <input
          className="border border-ink/10 bg-transparent rounded-lg px-3 py-2 text-sm w-full mb-3"
          placeholder="جستجو بر اساس نام یا شهر..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {!venues ? (
          <SkeletonRows rows={5} />
        ) : (
          <>
            <button type="button" onClick={toggleAll} className="text-xs text-primary-700 hover:underline mb-2">
              {filtered.every((v) => selected.has(v.id)) && filtered.length > 0 ? 'لغو انتخاب همه' : 'انتخاب همه (نتایج فیلترشده)'}
            </button>
            <div className="max-h-80 overflow-y-auto space-y-1">
              {filtered.map((v) => (
                <label key={v.id} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg hover:bg-ink/5 cursor-pointer">
                  <input type="checkbox" checked={selected.has(v.id)} onChange={() => toggleVenue(v.id)} />
                  <span className="text-ink">{v.name}</span>
                  <span className="text-ink/40 text-xs">{v.city}</span>
                </label>
              ))}
              {filtered.length === 0 && <p className="text-ink/40 text-sm py-2">موردی یافت نشد.</p>}
            </div>
          </>
        )}
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-semibold text-ink mb-3">جستجو و جایگزینی گروهی در توضیحات</h3>
          <div className="space-y-2">
            <input
              className="border border-ink/10 bg-transparent rounded-lg px-3 py-2 text-sm w-full"
              placeholder="متن جستجو"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
            />
            <input
              className="border border-ink/10 bg-transparent rounded-lg px-3 py-2 text-sm w-full"
              placeholder="متن جایگزین (اختیاری)"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
            />
            <Button onClick={runFindReplace} disabled={busy}>
              اعمال روی مجموعه‌های انتخاب‌شده
            </Button>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-ink mb-3">تغییر وضعیت گروهی</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => runStatusChange('isTemporarilyClosed', true)} disabled={busy}>
              تعطیلی موقت (فعال)
            </Button>
            <Button variant="ghost" onClick={() => runStatusChange('isTemporarilyClosed', false)} disabled={busy}>
              تعطیلی موقت (غیرفعال)
            </Button>
            <Button variant="secondary" onClick={() => runStatusChange('acceptsPickup', true)} disabled={busy}>
              پیک‌آپ (فعال)
            </Button>
            <Button variant="ghost" onClick={() => runStatusChange('acceptsPickup', false)} disabled={busy}>
              پیک‌آپ (غیرفعال)
            </Button>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-ink mb-3">تعدیل گروهی قیمت منو</h3>
          <div className="space-y-2">
            <input
              type="number"
              className="border border-ink/10 bg-transparent rounded-lg px-3 py-2 text-sm w-full"
              placeholder="درصد تغییر (مثلا 10 یا -15)"
              value={pricePercent}
              onChange={(e) => setPricePercent(e.target.value)}
            />
            <Button onClick={runPriceAdjust} disabled={busy}>
              اعمال روی همه آیتم‌های منوی مجموعه‌های انتخاب‌شده
            </Button>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-ink mb-3">تغییر گروهی موجودی آیتم منو</h3>
          <div className="space-y-2">
            <input
              className="border border-ink/10 bg-transparent rounded-lg px-3 py-2 text-sm w-full"
              placeholder="بخشی از نام آیتم (مثلا اسپرسو)"
              value={itemNameContains}
              onChange={(e) => setItemNameContains(e.target.value)}
            />
            <div className="flex items-center gap-3 text-sm text-ink/70">
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={itemAvailable} onChange={() => setItemAvailable(true)} /> موجود
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={!itemAvailable} onChange={() => setItemAvailable(false)} /> ناموجود
              </label>
            </div>
            <Button onClick={runAvailability} disabled={busy}>
              اعمال روی مجموعه‌های انتخاب‌شده
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

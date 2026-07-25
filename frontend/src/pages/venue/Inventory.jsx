import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';

const TABS = ['مواد اولیه', 'دستور پخت', 'تنظیم موجودی', 'تامین‌کنندگان', 'سفارش خرید', 'حاشیه سود'];
const REASON_LABELS = { RESTOCK: 'شارژ', MANUAL_DEDUCTION: 'کسر دستی', WASTAGE: 'ضایعات', ORDER_CONSUMED: 'مصرف سفارش', AUDIT: 'ممیزی' };
const PO_STATUS = { DRAFT: 'پیش‌نویس', ORDERED: 'ثبت شده', RECEIVED: 'دریافت شده', CANCELLED: 'لغو شده' };

export default function Inventory() {
  const { user } = useAuth();
  const venueId = user?.venueId;
  const [tab, setTab] = useState(0);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-800">مدیریت انبار و مواد اولیه</h2>
      <div className="flex gap-2 flex-wrap">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              tab === i ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}>
            {t}
          </button>
        ))}
      </div>
      {tab === 0 && <MaterialsTab venueId={venueId} />}
      {tab === 1 && <RecipesTab venueId={venueId} />}
      {tab === 2 && <AdjustmentsTab venueId={venueId} />}
      {tab === 3 && <SuppliersTab venueId={venueId} />}
      {tab === 4 && <PurchaseOrdersTab venueId={venueId} />}
      {tab === 5 && <MarginsTab venueId={venueId} />}
    </div>
  );
}

function MarginsTab({ venueId }) {
  const [margins, setMargins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/venues/${venueId}/inventory/margins`).then(({ data }) => { setMargins(data); setLoading(false); });
  }, [venueId]);

  if (loading) return <p className="text-gray-500 text-sm">در حال بارگذاری...</p>;

  return (
    <Card className="p-0 overflow-hidden">
      <p className="text-xs text-gray-500 p-4 pb-0">
        حاشیه سود بر اساس هزینه مواد اولیه در «دستور پخت» هر آیتم محاسبه می‌شود. آیتم‌هایی که دستور پخت ندارند «—» نشان می‌دهند.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm mt-3">
          <thead>
            <tr className="text-right text-xs text-gray-400 border-b">
              <th className="px-4 py-2 font-medium">آیتم</th>
              <th className="px-4 py-2 font-medium">قیمت فروش</th>
              <th className="px-4 py-2 font-medium">هزینه مواد اولیه</th>
              <th className="px-4 py-2 font-medium">حاشیه سود</th>
              <th className="px-4 py-2 font-medium">درصد حاشیه</th>
            </tr>
          </thead>
          <tbody>
            {margins.map((m) => (
              <tr key={m.id} className="border-b last:border-0">
                <td className="px-4 py-2.5 font-medium text-gray-800">{m.name}</td>
                <td className="px-4 py-2.5 text-gray-600">{m.price.toLocaleString('fa-IR')} ت</td>
                <td className="px-4 py-2.5 text-gray-600">{m.cost === null ? '—' : `${Math.round(m.cost).toLocaleString('fa-IR')} ت`}</td>
                <td className={`px-4 py-2.5 font-medium ${m.margin === null ? 'text-gray-400' : m.margin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {m.margin === null ? '—' : `${Math.round(m.margin).toLocaleString('fa-IR')} ت`}
                </td>
                <td className={`px-4 py-2.5 font-medium ${m.marginPercent === null ? 'text-gray-400' : m.marginPercent > 30 ? 'text-green-600' : m.marginPercent > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {m.marginPercent === null ? '—' : `${m.marginPercent.toLocaleString('fa-IR')}٪`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function MaterialsTab({ venueId }) {
  const [materials, setMaterials] = useState([]);
  const [form, setForm] = useState({ name: '', unit: '', currentStock: 0, reorderThreshold: 0, costPerUnit: 0 });
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await api.get(`/venues/${venueId}/inventory/materials`);
    setMaterials(data);
  }
  useEffect(() => { if (venueId) load(); }, [venueId]);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) { await api.patch(`/venues/${venueId}/inventory/materials/${editing}`, form); }
      else { await api.post(`/venues/${venueId}/inventory/materials`, form); }
      setForm({ name: '', unit: '', currentStock: 0, reorderThreshold: 0, costPerUnit: 0 });
      setEditing(null);
      await load();
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{editing ? 'ویرایش ماده' : 'افزودن ماده اولیه'}</h3>
        <form onSubmit={save} className="grid sm:grid-cols-3 gap-3">
          <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="نام" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="واحد (مثلاً: گرم، ml، عدد)" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required />
          <input type="number" step="0.001" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="موجودی فعلی" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: Number(e.target.value) })} />
          <input type="number" step="0.001" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="آستانه سفارش مجدد" value={form.reorderThreshold} onChange={(e) => setForm({ ...form, reorderThreshold: Number(e.target.value) })} />
          <input type="number" step="0.01" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="هزینه هر واحد (تومان)" value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: Number(e.target.value) })} />
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>{editing ? 'بروزرسانی' : 'افزودن'}</Button>
            {editing && <Button type="button" variant="ghost" onClick={() => { setEditing(null); setForm({ name: '', unit: '', currentStock: 0, reorderThreshold: 0, costPerUnit: 0 }); }}>انصراف</Button>}
          </div>
        </form>
      </Card>
      <div className="space-y-2">
        {materials.map((m) => {
          const isLow = Number(m.currentStock) <= Number(m.reorderThreshold);
          return (
            <Card key={m.id} className={isLow ? 'border-red-200 bg-red-50' : ''}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-medium text-gray-800">{m.name} {isLow && <span className="inline-flex items-center gap-0.5 text-xs text-red-600 font-normal"><AlertTriangle size={12} />موجودی کم</span>}</p>
                  <p className="text-sm text-gray-500">
                    موجودی: <span className={`font-medium ${isLow ? 'text-red-600' : 'text-gray-900'}`}>{Number(m.currentStock).toLocaleString('fa-IR')}</span> {m.unit}
                    {' — '}آستانه: {Number(m.reorderThreshold).toLocaleString('fa-IR')} {m.unit}
                  </p>
                  {m.supplierName && <p className="text-xs text-gray-400 mt-0.5">تامین‌کننده: {m.supplierName}</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => { setEditing(m.id); setForm({ name: m.name, unit: m.unit, currentStock: m.currentStock, reorderThreshold: m.reorderThreshold, costPerUnit: m.costPerUnit }); }}>ویرایش</Button>
                  <Button variant="danger" onClick={async () => { await api.delete(`/venues/${venueId}/inventory/materials/${m.id}`); load(); }}>حذف</Button>
                </div>
              </div>
            </Card>
          );
        })}
        {materials.length === 0 && <p className="text-gray-500 text-sm">هنوز ماده‌ای اضافه نشده است.</p>}
      </div>
    </div>
  );
}

function RecipesTab({ venueId }) {
  const [recipes, setRecipes] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [form, setForm] = useState({ menuItemId: '', rawMaterialId: '', quantity: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    const [{ data: r }, { data: m }, { data: mi }] = await Promise.all([
      api.get(`/venues/${venueId}/inventory/recipes`),
      api.get(`/venues/${venueId}/inventory/materials`),
      api.get(`/menu/${venueId}/items`),
    ]);
    setRecipes(r); setMaterials(m); setMenuItems(mi);
  }
  useEffect(() => { if (venueId) load(); }, [venueId]);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/venues/${venueId}/inventory/recipes`, form);
      setForm({ menuItemId: '', rawMaterialId: '', quantity: '' });
      await load();
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">افزودن پیوند دستور پخت</h3>
        <form onSubmit={save} className="grid sm:grid-cols-4 gap-3">
          <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.menuItemId} onChange={(e) => setForm({ ...form, menuItemId: e.target.value })} required>
            <option value="">انتخاب آیتم منو</option>
            {menuItems.map((mi) => <option key={mi.id} value={mi.id}>{mi.name}</option>)}
          </select>
          <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.rawMaterialId} onChange={(e) => setForm({ ...form, rawMaterialId: e.target.value })} required>
            <option value="">انتخاب ماده اولیه</option>
            {materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
          </select>
          <input type="number" step="0.001" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="مقدار مصرف به ازای هر واحد" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
          <Button type="submit" disabled={saving}>افزودن</Button>
        </form>
      </Card>
      <div className="divide-y border rounded-lg overflow-hidden">
        {recipes.map((r) => (
          <div key={r.id} className="px-4 py-3 flex items-center justify-between bg-white">
            <div>
              <p className="text-sm font-medium text-gray-800">{r.menuItemName || r.optionName}</p>
              <p className="text-xs text-gray-500">{Number(r.quantity).toLocaleString('fa-IR')} {r.unit} از {r.materialName}</p>
            </div>
            <Button variant="danger" onClick={async () => { await api.delete(`/venues/${venueId}/inventory/recipes/${r.id}`); load(); }}>حذف</Button>
          </div>
        ))}
        {recipes.length === 0 && <p className="text-gray-500 text-sm p-4">هنوز دستور پختی تعریف نشده.</p>}
      </div>
    </div>
  );
}

function AdjustmentsTab({ venueId }) {
  const [adjustments, setAdjustments] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [form, setForm] = useState({ rawMaterialId: '', delta: '', reason: 'RESTOCK', notes: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    const [{ data: a }, { data: m }] = await Promise.all([
      api.get(`/venues/${venueId}/inventory/adjustments`),
      api.get(`/venues/${venueId}/inventory/materials`),
    ]);
    setAdjustments(a); setMaterials(m);
  }
  useEffect(() => { if (venueId) load(); }, [venueId]);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/venues/${venueId}/inventory/adjustments`, form);
      setForm({ rawMaterialId: '', delta: '', reason: 'RESTOCK', notes: '' });
      await load();
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">ثبت تنظیم موجودی</h3>
        <form onSubmit={save} className="grid sm:grid-cols-2 gap-3">
          <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.rawMaterialId} onChange={(e) => setForm({ ...form, rawMaterialId: e.target.value })} required>
            <option value="">انتخاب ماده اولیه</option>
            {materials.map((m) => <option key={m.id} value={m.id}>{m.name} — موجودی: {Number(m.currentStock).toLocaleString('fa-IR')} {m.unit}</option>)}
          </select>
          <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
            {Object.entries(REASON_LABELS).filter(([k]) => k !== 'ORDER_CONSUMED').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input type="number" step="0.001" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="مقدار (مثبت=اضافه، منفی=کسر)" value={form.delta} onChange={(e) => setForm({ ...form, delta: e.target.value })} required />
          <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="یادداشت" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving}>ثبت</Button>
          </div>
        </form>
      </Card>
      <div className="divide-y border rounded-lg overflow-hidden">
        {adjustments.map((a) => (
          <div key={a.id} className="px-4 py-3 flex items-center justify-between bg-white">
            <div>
              <p className="text-sm font-medium text-gray-800">
                {a.materialName} — <span className={Number(a.delta) > 0 ? 'text-green-600' : 'text-red-600'}>{Number(a.delta) > 0 ? '+' : ''}{Number(a.delta).toLocaleString('fa-IR')} {a.unit}</span>
              </p>
              <p className="text-xs text-gray-500">{REASON_LABELS[a.reason] || a.reason} {a.performedByName && `— ${a.performedByName}`} — {new Date(a.createdAt).toLocaleString('fa-IR')}</p>
              {a.notes && <p className="text-xs text-gray-400">{a.notes}</p>}
            </div>
          </div>
        ))}
        {adjustments.length === 0 && <p className="text-gray-500 text-sm p-4">هنوز تنظیمی ثبت نشده.</p>}
      </div>
    </div>
  );
}

function SuppliersTab({ venueId }) {
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState({ name: '', contactName: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);

  async function load() { const { data } = await api.get(`/venues/${venueId}/inventory/suppliers`); setSuppliers(data); }
  useEffect(() => { if (venueId) load(); }, [venueId]);

  async function save(e) {
    e.preventDefault(); setSaving(true);
    try { await api.post(`/venues/${venueId}/inventory/suppliers`, form); setForm({ name: '', contactName: '', phone: '', email: '' }); await load(); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">افزودن تامین‌کننده</h3>
        <form onSubmit={save} className="grid sm:grid-cols-2 gap-3">
          <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="نام شرکت/فرد" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="نام مسئول" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
          <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="تلفن" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="ایمیل" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div><Button type="submit" disabled={saving}>افزودن</Button></div>
        </form>
      </Card>
      <div className="space-y-2">
        {suppliers.map((s) => (
          <Card key={s.id} className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">{s.name}</p>
              <p className="text-xs text-gray-500">{[s.contactName, s.phone, s.email].filter(Boolean).join(' — ')}</p>
            </div>
            <Button variant="danger" onClick={async () => { await api.delete(`/venues/${venueId}/inventory/suppliers/${s.id}`); load(); }}>حذف</Button>
          </Card>
        ))}
        {suppliers.length === 0 && <p className="text-gray-500 text-sm">هنوز تامین‌کننده‌ای ثبت نشده.</p>}
      </div>
    </div>
  );
}

function PurchaseOrdersTab({ venueId }) {
  const [orders, setOrders] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [lines, setLines] = useState([{ rawMaterialId: '', quantity: '', costPerUnit: '' }]);
  const [form, setForm] = useState({ supplierId: '', notes: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    const [{ data: o }, { data: m }, { data: s }] = await Promise.all([
      api.get(`/venues/${venueId}/inventory/purchase-orders`),
      api.get(`/venues/${venueId}/inventory/materials`),
      api.get(`/venues/${venueId}/inventory/suppliers`),
    ]);
    setOrders(o); setMaterials(m); setSuppliers(s);
  }
  useEffect(() => { if (venueId) load(); }, [venueId]);

  async function save(e) {
    e.preventDefault(); setSaving(true);
    try {
      await api.post(`/venues/${venueId}/inventory/purchase-orders`, { ...form, items: lines.filter((l) => l.rawMaterialId && l.quantity) });
      setLines([{ rawMaterialId: '', quantity: '', costPerUnit: '' }]);
      setForm({ supplierId: '', notes: '' });
      await load();
    } finally { setSaving(false); }
  }

  async function updateStatus(poId, status) {
    await api.patch(`/venues/${venueId}/inventory/purchase-orders/${poId}/status`, { status });
    await load();
  }

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">ثبت سفارش خرید جدید</h3>
        <form onSubmit={save} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
              <option value="">بدون تامین‌کننده</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="یادداشت" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          {lines.map((line, i) => (
            <div key={i} className="grid sm:grid-cols-3 gap-2">
              <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={line.rawMaterialId} onChange={(e) => { const l = [...lines]; l[i].rawMaterialId = e.target.value; setLines(l); }}>
                <option value="">انتخاب ماده</option>
                {materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
              </select>
              <input type="number" step="0.001" placeholder="مقدار" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={line.quantity} onChange={(e) => { const l = [...lines]; l[i].quantity = e.target.value; setLines(l); }} />
              <input type="number" step="0.01" placeholder="هزینه هر واحد" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={line.costPerUnit} onChange={(e) => { const l = [...lines]; l[i].costPerUnit = e.target.value; setLines(l); }} />
            </div>
          ))}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setLines([...lines, { rawMaterialId: '', quantity: '', costPerUnit: '' }])}>+ ردیف</Button>
            <Button type="submit" disabled={saving}>ثبت سفارش</Button>
          </div>
        </form>
      </Card>
      <div className="space-y-3">
        {orders.map((po) => (
          <Card key={po.id}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-medium text-gray-800">{po.supplierName || 'بدون تامین‌کننده'} — <span className="text-sm font-normal">{PO_STATUS[po.status]}</span></p>
                <p className="text-xs text-gray-500">{Number(po.totalCost).toLocaleString('fa-IR')} تومان — {new Date(po.createdAt).toLocaleDateString('fa-IR')}</p>
              </div>
              <div className="flex gap-2">
                {po.status === 'DRAFT' && <Button variant="secondary" onClick={() => updateStatus(po.id, 'ORDERED')}>ثبت نزد تامین‌کننده</Button>}
                {po.status === 'ORDERED' && <Button variant="secondary" onClick={() => updateStatus(po.id, 'RECEIVED')}>تایید دریافت</Button>}
                {['DRAFT','ORDERED'].includes(po.status) && <Button variant="danger" onClick={() => updateStatus(po.id, 'CANCELLED')}>لغو</Button>}
              </div>
            </div>
            {po.items?.length > 0 && (
              <ul className="mt-2 text-xs text-gray-500 space-y-0.5">
                {po.items.map((item) => (
                  <li key={item.id}>{item.materialName}: {Number(item.quantity).toLocaleString('fa-IR')} {item.unit} — هر واحد {Number(item.costPerUnit).toLocaleString('fa-IR')} تومان</li>
                ))}
              </ul>
            )}
          </Card>
        ))}
        {orders.length === 0 && <p className="text-gray-500 text-sm">هنوز سفارش خریدی ثبت نشده.</p>}
      </div>
    </div>
  );
}

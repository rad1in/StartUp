import { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import FeatureFlagsPanel from '../../components/FeatureFlagsPanel';

export default function Content() {
  const [faqs, setFaqs] = useState([]);
  const [banners, setBanners] = useState([]);
  const [settings, setSettings] = useState({ radiusMeters: 100, supportedCities: [] });
  const [citiesText, setCitiesText] = useState('');
  const [faqForm, setFaqForm] = useState({ question: '', answer: '' });
  const [bannerForm, setBannerForm] = useState({ title: '', body: '', audience: 'CUSTOMER' });

  async function refresh() {
    const [{ data: faqData }, { data: bannerData }, { data: settingsData }] = await Promise.all([
      api.get('/admin/content/faq'),
      api.get('/admin/content/banners'),
      api.get('/admin/content/settings'),
    ]);
    setFaqs(faqData);
    setBanners(bannerData);
    setSettings(settingsData);
    setCitiesText(settingsData.supportedCities.join('، '));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function createFaq(e) {
    e.preventDefault();
    if (!faqForm.question || !faqForm.answer) return;
    await api.post('/admin/content/faq', faqForm);
    setFaqForm({ question: '', answer: '' });
    refresh();
  }

  async function deleteFaq(id) {
    await api.delete(`/admin/content/faq/${id}`);
    refresh();
  }

  async function createBanner(e) {
    e.preventDefault();
    if (!bannerForm.title) return;
    await api.post('/admin/content/banners', bannerForm);
    setBannerForm({ title: '', body: '', audience: 'CUSTOMER' });
    refresh();
  }

  async function toggleBanner(banner) {
    await api.patch(`/admin/content/banners/${banner.id}`, { isActive: !banner.isActive });
    refresh();
  }

  async function deleteBanner(id) {
    await api.delete(`/admin/content/banners/${id}`);
    refresh();
  }

  async function saveSettings(e) {
    e.preventDefault();
    const supportedCities = citiesText
      .split('،')
      .map((c) => c.trim())
      .filter(Boolean);
    await api.patch('/admin/content/settings', { radiusMeters: settings.radiusMeters, supportedCities });
    refresh();
  }

  return (
    <div className="space-y-6">
      <FeatureFlagsPanel />

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">تنظیمات کشف مجموعه‌ها</h3>
        <form onSubmit={saveSettings} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">شعاع کشف (متر)</label>
            <input
              type="number"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-40"
              value={settings.radiusMeters}
              onChange={(e) => setSettings((s) => ({ ...s, radiusMeters: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">شهرهای پشتیبانی‌شده (با «،» جدا کنید)</label>
            <input
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
              value={citiesText}
              onChange={(e) => setCitiesText(e.target.value)}
            />
          </div>
          <Button type="submit">ذخیره تنظیمات</Button>
        </form>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">سوالات متداول</h3>
        <form onSubmit={createFaq} className="space-y-2 mb-4">
          <input
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
            placeholder="سوال"
            value={faqForm.question}
            onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
          />
          <textarea
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
            placeholder="پاسخ"
            value={faqForm.answer}
            onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
          />
          <Button type="submit">افزودن سوال</Button>
        </form>
        <div className="space-y-2">
          {faqs.map((faq) => (
            <div key={faq.id} className="flex items-start justify-between border-b border-gray-100 pb-2">
              <div>
                <p className="text-sm font-medium text-gray-800">{faq.question}</p>
                <p className="text-xs text-gray-500">{faq.answer}</p>
              </div>
              <Button variant="danger" onClick={() => deleteFaq(faq.id)}>
                حذف
              </Button>
            </div>
          ))}
          {faqs.length === 0 && <p className="text-gray-500 text-sm">سوالی ثبت نشده است.</p>}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">بنرها و اعلان‌ها</h3>
        <form onSubmit={createBanner} className="space-y-2 mb-4">
          <input
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
            placeholder="عنوان بنر"
            value={bannerForm.title}
            onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
          />
          <textarea
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
            placeholder="متن بنر"
            value={bannerForm.body}
            onChange={(e) => setBannerForm({ ...bannerForm, body: e.target.value })}
          />
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={bannerForm.audience}
            onChange={(e) => setBannerForm({ ...bannerForm, audience: e.target.value })}
          >
            <option value="CUSTOMER">مشتریان</option>
            <option value="VENUE">مجموعه‌ها</option>
          </select>
          <Button type="submit">افزودن بنر</Button>
        </form>
        <div className="space-y-2">
          {banners.map((banner) => (
            <div key={banner.id} className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div>
                <p className="text-sm font-medium text-gray-800">{banner.title}</p>
                <p className="text-xs text-gray-500">{banner.audience === 'CUSTOMER' ? 'مشتریان' : 'مجموعه‌ها'}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant={banner.isActive ? 'primary' : 'ghost'} onClick={() => toggleBanner(banner)}>
                  {banner.isActive ? 'فعال' : 'غیرفعال'}
                </Button>
                <Button variant="danger" onClick={() => deleteBanner(banner.id)}>
                  حذف
                </Button>
              </div>
            </div>
          ))}
          {banners.length === 0 && <p className="text-gray-500 text-sm">بنری ثبت نشده است.</p>}
        </div>
      </Card>
    </div>
  );
}

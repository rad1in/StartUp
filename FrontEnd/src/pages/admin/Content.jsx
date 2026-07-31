import { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import FeatureFlagsPanel from '../../components/FeatureFlagsPanel';
import { useLanguage } from '../../context/LanguageContext';

export default function Content() {
  const { t } = useLanguage();
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
        <h3 className="font-semibold text-gray-800 mb-3">{t('admin.content.discoverySettingsTitle')}</h3>
        <form onSubmit={saveSettings} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('admin.content.discoveryRadiusLabel')}</label>
            <input
              type="number"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-40"
              value={settings.radiusMeters}
              onChange={(e) => setSettings((s) => ({ ...s, radiusMeters: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('admin.content.supportedCitiesLabel')}</label>
            <input
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
              value={citiesText}
              onChange={(e) => setCitiesText(e.target.value)}
            />
          </div>
          <Button type="submit">{t('common.save')}</Button>
        </form>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{t('admin.content.faqTitle')}</h3>
        <form onSubmit={createFaq} className="space-y-2 mb-4">
          <input
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
            placeholder={t('admin.content.questionPlaceholder')}
            value={faqForm.question}
            onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
          />
          <textarea
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
            placeholder={t('admin.content.answerPlaceholder')}
            value={faqForm.answer}
            onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
          />
          <Button type="submit">{t('admin.content.addQuestion')}</Button>
        </form>
        <div className="space-y-2">
          {faqs.map((faq) => (
            <div key={faq.id} className="flex items-start justify-between border-b border-gray-100 pb-2">
              <div>
                <p className="text-sm font-medium text-gray-800">{faq.question}</p>
                <p className="text-xs text-gray-500">{faq.answer}</p>
              </div>
              <Button variant="danger" onClick={() => deleteFaq(faq.id)}>
                {t('common.delete')}
              </Button>
            </div>
          ))}
          {faqs.length === 0 && <p className="text-gray-500 text-sm">{t('admin.content.noFaqsRecorded')}</p>}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{t('admin.content.bannersTitle')}</h3>
        <form onSubmit={createBanner} className="space-y-2 mb-4">
          <input
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
            placeholder={t('admin.content.bannerTitlePlaceholder')}
            value={bannerForm.title}
            onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
          />
          <textarea
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
            placeholder={t('admin.content.bannerBodyPlaceholder')}
            value={bannerForm.body}
            onChange={(e) => setBannerForm({ ...bannerForm, body: e.target.value })}
          />
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={bannerForm.audience}
            onChange={(e) => setBannerForm({ ...bannerForm, audience: e.target.value })}
          >
            <option value="CUSTOMER">{t('admin.content.audienceCustomers')}</option>
            <option value="VENUE">{t('admin.content.audienceVenues')}</option>
          </select>
          <Button type="submit">{t('admin.content.addBanner')}</Button>
        </form>
        <div className="space-y-2">
          {banners.map((banner) => (
            <div key={banner.id} className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div>
                <p className="text-sm font-medium text-gray-800">{banner.title}</p>
                <p className="text-xs text-gray-500">{banner.audience === 'CUSTOMER' ? t('admin.content.audienceCustomers') : t('admin.content.audienceVenues')}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant={banner.isActive ? 'primary' : 'ghost'} onClick={() => toggleBanner(banner)}>
                  {banner.isActive ? t('common.active') : t('common.inactive')}
                </Button>
                <Button variant="danger" onClick={() => deleteBanner(banner.id)}>
                  {t('common.delete')}
                </Button>
              </div>
            </div>
          ))}
          {banners.length === 0 && <p className="text-gray-500 text-sm">{t('admin.content.noBannersRecorded')}</p>}
        </div>
      </Card>
    </div>
  );
}

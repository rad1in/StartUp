import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coffee } from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { resolveImageUrl } from '../../components/VenueCards';
import { useLanguage } from '../../context/LanguageContext';

function Thumb({ src }) {
  return (
    <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
      {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : <Coffee size={18} className="text-gray-400" />}
    </div>
  );
}

export default function Favorites() {
  const navigate = useNavigate();
  const { t, n, dateShort } = useLanguage();
  const [venues, setVenues] = useState([]);
  const [items, setItems] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  async function refresh() {
    const [{ data: v }, { data: i }, { data: r }] = await Promise.all([
      api.get('/favorites/venues'),
      api.get('/favorites/items'),
      api.get('/favorites/recently-viewed'),
    ]);
    setVenues(v);
    setItems(i);
    setRecentlyViewed(r);
  }

  useEffect(() => { refresh(); }, []);

  async function removeVenue(venueId) {
    await api.delete(`/favorites/venues/${venueId}`);
    refresh();
  }

  async function removeItem(itemId) {
    await api.delete(`/favorites/items/${itemId}`);
    refresh();
  }

  function reorderItem(item) {
    navigate(`/menu/${item.venueId}`, {
      state: {
        reorderItems: [
          {
            menuItemId: item.id,
            quantity: 1,
            modifierSelections: item.savedCustomization || [],
          },
        ],
      },
    });
  }

  return (
    <div className="space-y-8">
      <section>
        <h3 className="font-semibold text-gray-800 mb-3">{t('favorites.favoriteVenues')}</h3>
        {venues.length === 0 && <p className="text-gray-500 text-sm">{t('favorites.noVenues')}</p>}
        <div className="grid sm:grid-cols-2 gap-3">
          {venues.map((venue) => (
            <Card key={venue.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0" onClick={() => navigate(`/menu/${venue.id}`)}>
                <Thumb src={resolveImageUrl(venue.coverImageUrl || venue.logoUrl)} />
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 truncate">{venue.name}</p>
                  <p className="text-xs text-gray-500 truncate">{venue.address}</p>
                </div>
              </div>
              <Button variant="ghost" onClick={() => removeVenue(venue.id)}>
                {t('account.delete')}
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-semibold text-gray-800 mb-3">{t('favorites.favoriteItems')}</h3>
        {items.length === 0 && <p className="text-gray-500 text-sm">{t('favorites.noItems')}</p>}
        <div className="grid sm:grid-cols-2 gap-3">
          {items.map((item) => (
            <Card key={item.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                <Thumb src={resolveImageUrl(item.imageUrl)} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800">{item.name}</p>
                  {item.nickname && (
                    <p className="text-xs text-primary-700 font-medium mt-0.5">{item.nickname}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">{n(Number(item.price))} {t('menu.toman')}</p>
                  {item.savedCustomization && item.savedCustomization.length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.savedCustomization.flatMap((s) => s.optionIds || []).length} {t('favorites.savedOptionsSuffix')}
                    </p>
                  )}
                </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button variant="secondary" onClick={() => reorderItem(item)}>
                    {t('favorites.oneClickOrder')}
                  </Button>
                  <Button variant="ghost" onClick={() => removeItem(item.id)}>
                    {t('account.delete')}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h3 className="font-semibold text-gray-800 mb-3">{t('favorites.recentlyViewed')}</h3>
        {recentlyViewed.length === 0 && <p className="text-gray-500 text-sm">{t('favorites.noRecentlyViewed')}</p>}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {recentlyViewed.map((venue) => (
            <Card
              key={venue.id}
              className="min-w-[180px] cursor-pointer"
              onClick={() => navigate(`/menu/${venue.id}`)}
            >
              <Thumb src={resolveImageUrl(venue.coverImageUrl || venue.logoUrl)} />
              <p className="font-medium text-gray-800 mt-2">{venue.name}</p>
              <p className="text-xs text-gray-500">{dateShort(venue.viewedAt)}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

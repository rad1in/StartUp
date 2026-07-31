// Curated list of well-known Iranian cities for the city picker — deliberately
// small and hand-picked instead of the full ~1,600-row City table, so the
// picker stays a quick, scannable list instead of a directory of every town.
export const POPULAR_CITIES = [
  { name: 'تهران', slug: 'tehran', lat: 35.741052615, lng: 51.393044919 },
  { name: 'مشهد', slug: 'mashhad', lat: 36.297, lng: 59.598 },
  { name: 'اصفهان', slug: 'esfahan', lat: 32.649, lng: 51.667 },
  { name: 'شیراز', slug: 'shiraz', lat: 29.625, lng: 52.558 },
  { name: 'کرج', slug: 'karaj', lat: 35.821, lng: 50.955 },
  { name: 'تبریز', slug: 'tabriz', lat: 38.041, lng: 46.352 },
  { name: 'رشت', slug: 'rasht', lat: 37.297, lng: 49.585 },
  { name: 'اهواز', slug: 'ahvaz', lat: 31.319, lng: 48.694 },
  { name: 'قم', slug: 'qom', lat: 34.639, lng: 50.876 },
  { name: 'کرمانشاه', slug: 'kermanshah', lat: 34.314, lng: 47.065 },
  { name: 'یزد', slug: 'yazd', lat: 31.897, lng: 54.367 },
  { name: 'ارومیه', slug: 'urmia', lat: 37.553, lng: 45.076 },
  { name: 'کرمان', slug: 'kerman', lat: 30.283, lng: 57.078 },
  { name: 'همدان', slug: 'hamedan', lat: 34.799, lng: 48.515 },
  { name: 'ساری', slug: 'sari', lat: 36.563, lng: 53.061 },
];

export const DEFAULT_CITY = POPULAR_CITIES[0];

export function findPopularCityByName(name) {
  if (!name) return null;
  return POPULAR_CITIES.find((c) => c.name === name || name.includes(c.name)) || null;
}

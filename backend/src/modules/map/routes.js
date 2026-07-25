const express = require('express');
const https = require('https');
const { config } = require('../../config/config');

const router = express.Router();

function neshanGet(path, params, res, next) {
  const key = config.neshanServiceKey;
  if (!key) {
    return res.status(503).json({ message: 'سرویس نقشه پیکربندی نشده است.' });
  }
  const url = `https://api.neshan.org${path}?${params.toString()}`;
  https.get(url, { headers: { 'Api-Key': key } }, (upstream) => {
    res.status(upstream.statusCode);
    res.setHeader('Content-Type', upstream.headers['content-type'] || 'application/json');
    upstream.pipe(res);
  }).on('error', next);
}

// Static map image — proxied so the API key stays server-side
router.get('/static', (req, res, next) => {
  const { lat, lng, zoom = 14, width = 600, height = 300, style = 'light', marker } = req.query;
  if (!lat || !lng) return res.status(400).json({ message: 'lat و lng الزامی هستند.' });

  const key = config.neshanServiceKey;
  if (!key) return res.status(503).json({ message: 'سرویس نقشه پیکربندی نشده است.' });

  const params = new URLSearchParams({
    type: style,
    zoom: String(zoom),
    latitude: String(lat),
    longitude: String(lng),
    width: String(Math.min(Number(width), 2048)),
    height: String(Math.min(Number(height), 2048)),
  });
  if (marker) params.set('marker', marker);

  const upstream = `https://api.neshan.org/v5/static?${params.toString()}`;
  https.get(upstream, { headers: { 'Api-Key': key } }, (neshanRes) => {
    if (neshanRes.statusCode !== 200) {
      res.status(neshanRes.statusCode || 502).json({ message: 'خطا در دریافت نقشه از سرویس نشان.' });
      neshanRes.resume();
      return;
    }
    res.setHeader('Content-Type', neshanRes.headers['content-type'] || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    neshanRes.pipe(res);
  }).on('error', next);
});

// Reverse geocoding — convert coordinates to a Persian address
router.get('/reverse', (req, res, next) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ message: 'lat و lng الزامی هستند.' });
  neshanGet('/v5/reverse', new URLSearchParams({ lat, lng }), res, next);
});

// Place/address search — term + optional reference point
router.get('/search', (req, res, next) => {
  const { term, lat = '35.6892', lng = '51.3890' } = req.query;
  if (!term) return res.status(400).json({ message: 'term الزامی است.' });
  neshanGet('/v1/search', new URLSearchParams({ term, lat, lng }), res, next);
});

module.exports = router;

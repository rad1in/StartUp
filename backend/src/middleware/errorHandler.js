const { randomUUID } = require('crypto');
const { renderStatusPage, sendStatus } = require('../lib/statusPage');

function notFoundHandler(req, res) {
  sendStatus(req, res, {
    code: 404,
    json: { message: 'مسیر مورد نظر یافت نشد.' },
    html: () =>
      renderStatusPage({
        title: '404 — Not Found',
        subtitle: `No route matches ${req.method} ${req.originalUrl}.`,
        tone: 'warn',
        code: 404,
        links: [
          { href: '/', label: '← Overview' },
          { href: '/api', label: '/api' },
        ],
      }),
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;

  if (status >= 500) {
    // Fire-and-forget — never let logging failures affect the actual response.
    try {
      // Lazy require to dodge any circular-import risk with lib/db during startup.
      const { pool } = require('../lib/db');
      pool
        .query(
          'INSERT INTO `ApiErrorLog` (id, method, path, statusCode, message) VALUES (?, ?, ?, ?, ?)',
          [randomUUID(), req.method, req.originalUrl, status, (err.message || '').slice(0, 500)]
        )
        .catch(() => {});
    } catch (logErr) {
      // ignore
    }
  }

  // 5xx details (driver errors, stack hints, SQL fragments, file paths) never
  // reach the client, in any environment — only the full err gets logged
  // server-side above. Every 4xx error, by contrast, is expected to already
  // carry a proper three-part message (where/why/how-to-fix) from wherever
  // it was thrown; this fallback only fires for a genuinely unexpected
  // exception the app didn't anticipate.
  const message =
    status >= 500
      ? 'مشکل از سمت سرور است: یک خطای فنی غیرمنتظره در پردازش درخواست شما رخ داد و ربطی به کاری که انجام دادید ندارد. لطفاً چند لحظه صبر کنید و دوباره تلاش کنید؛ اگر مشکل ادامه داشت، از بخش پشتیبانی به ما اطلاع دهید.'
      : err.message || 'درخواست شما قابل انجام نبود. لطفاً اطلاعات را بررسی و دوباره تلاش کنید.';

  // A small, optional machine-readable code (e.g. 'VENUE_FULL') lets the
  // frontend react to a *specific* known error case (offer a fallback
  // action) instead of just showing the message — most errors don't set
  // this, and its absence changes nothing for existing callers.
  sendStatus(req, res, {
    code: status,
    json: err.code ? { message, code: err.code } : { message },
    html: () =>
      renderStatusPage({
        title: status >= 500 ? '500 — Server Error' : `${status} — Request Error`,
        subtitle: message,
        tone: 'err',
        code: status,
        links: [{ href: '/', label: '← Overview' }],
      }),
  });
}

module.exports = { notFoundHandler, errorHandler };

const https = require('https');
const { config } = require('../config/config');

const LANG_NAMES = { en: 'English', ar: 'Arabic', tr: 'Turkish' };

// GapGPT (https://gapgpt.app) is an OpenAI-compatible proxy — a plain POST to
// its chat/completions endpoint, no SDK dependency, matching the raw-https
// style already used for hCaptcha in this codebase.
function callChatCompletion(messages) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: config.gapgpt.model,
      messages,
      temperature: 0,
    });

    const base = new URL(config.gapgpt.baseUrl);
    const req = https.request(
      {
        hostname: base.hostname,
        port: 443,
        path: `${base.pathname.replace(/\/$/, '')}/chat/completions`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          Authorization: `Bearer ${config.gapgpt.apiKey}`,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            const content = parsed?.choices?.[0]?.message?.content;
            if (!content) return reject(new Error('پاسخ نامعتبر از سرویس ترجمه.'));
            resolve(content);
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function extractJson(content) {
  // Models sometimes wrap JSON in a ```json fence despite instructions — strip it.
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : content;
  return JSON.parse(raw.trim());
}

// Translates a flat { field: string } object of Persian source text into each
// of targetLangs, returning { en: { field: '...' }, ar: { ... }, tr: { ... } }.
// Empty/missing source fields are skipped. Throws on any failure — callers
// must catch and swallow, since translation is a best-effort background
// enhancement and must never block or fail the venue owner's save.
async function translateFields(fields, targetLangs) {
  if (!config.gapgpt.apiKey) throw new Error('GAPGPT_API_KEY تنظیم نشده است.');

  const sourceEntries = Object.entries(fields).filter(([, v]) => v && String(v).trim());
  if (sourceEntries.length === 0) return {};

  const source = Object.fromEntries(sourceEntries);
  const langList = targetLangs.map((code) => `"${code}" (${LANG_NAMES[code] || code})`).join(', ');

  const prompt = [
    'You are a professional restaurant/cafe menu translator.',
    `Translate the following Persian JSON object's string values into these languages: ${langList}.`,
    'Keep tone natural and appetizing for a cafe menu; keep proper nouns as-is when appropriate.',
    'Respond with ONLY a single JSON object, no markdown, no explanation, in this exact shape:',
    `{ ${targetLangs.map((c) => `"${c}": { <same keys as input, translated values> }`).join(', ')} }`,
    'Persian source JSON:',
    JSON.stringify(source),
  ].join('\n');

  const content = await callChatCompletion([{ role: 'user', content: prompt }]);
  const result = extractJson(content);

  const out = {};
  for (const lang of targetLangs) {
    if (result[lang] && typeof result[lang] === 'object') out[lang] = result[lang];
  }
  return out;
}

module.exports = { translateFields, LANG_NAMES };

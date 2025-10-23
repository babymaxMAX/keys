import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 1) Загружаем ключи
const KEYS_PATH = path.join(__dirname, 'keys.txt');
let LIST = [];
function loadKeys() {
  try {
    const raw = fs.readFileSync(KEYS_PATH, 'utf8');
    LIST = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    console.log(`Loaded ${LIST.length} keys`);
  } catch (e) {
    console.error('Failed to read keys.txt', e);
    LIST = [];
  }
}
loadKeys();

// 2) /sub?id=N — отдаём исходный VLESS (для совместимости)
app.get('/sub', (req, res) => {
  const id = parseInt(req.query.id, 10);
  if (!Number.isFinite(id) || id < 1 || id > LIST.length) {
    return res
      .status(400)
      .set('Content-Type', 'text/plain; charset=utf-8')
      .set('Cache-Control', 'no-store')
      .send('invalid id\n');
  }
  const body = (LIST[id - 1] || '').trim() + '\n';
  res
    .status(200)
    .set('Content-Type', 'text/plain; charset=utf-8')
    .set('Cache-Control', 'no-store')
    .send(body);
});

// 3) Нормализуем строку VLESS (Android любит spx=%2F, обязателен encryption=none)
function normalizeVless(v) {
  if (!v) return v;
  let s = v.trim();
  // :port/? -> :port?
  s = s.replace(/:(\d+)\/\?/, ':$1?');
  const qIndex = s.indexOf('?');
  const hIndex = s.indexOf('#');
  const base = qIndex === -1 ? s : s.slice(0, qIndex);
  const query = qIndex === -1 ? '' : (hIndex === -1 ? s.slice(qIndex + 1) : s.slice(qIndex + 1, hIndex));
  const hash = hIndex === -1 ? '' : s.slice(hIndex + 1);

  const params = new URLSearchParams(query);
  if (!params.has('encryption')) params.set('encryption', 'none');
  if (params.has('spx')) params.set('spx', '%2F'); // однократно закодированный '/'

  const fixedQuery = params.toString();

  let fixedHash = hash;
  if (fixedHash) { try { fixedHash = decodeURIComponent(fixedHash); } catch(_) {} }

  return base + (fixedQuery ? '?' + fixedQuery : '') + (fixedHash ? '#' + fixedHash : '');
}

// 4) /config.html?id=N — отдаем РОВНО одну строку VLESS (text/plain)
app.get('/config.html', (req, res) => {
  const id = parseInt(req.query.id, 10);
  if (!Number.isFinite(id) || id < 1 || id > LIST.length) {
    return res
      .status(400)
      .set('Content-Type', 'text/plain; charset=utf-8')
      .set('Cache-Control', 'no-store')
      .send('invalid id\n');
  }
  const raw = (LIST[id - 1] || '').trim();
  const body = normalizeVless(raw) + '\n';
  res
    .status(200)
    .set('Content-Type', 'text/plain; charset=utf-8')
    .set('Cache-Control', 'no-store')
    .send(body);
});

// 5) Статика
app.use(express.static(__dirname, { extensions: ['html'] }));

// Health
app.get('/health', (_req, res) => res.send('ok'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on :${PORT}`));

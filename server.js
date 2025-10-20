import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Загружаем список ключей (по одному vless:// в строке)
const KEYS_PATH = path.join(__dirname, 'keys.txt');
let LIST = [];
function loadKeys() {
  try {
    const raw = fs.readFileSync(KEYS_PATH, 'utf8');
    LIST = raw
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);
    console.log(`Loaded ${LIST.length} keys`);
  } catch (e) {
    console.error('Failed to read keys.txt', e);
    LIST = [];
  }
}
loadKeys();

// Отдаём статику из корня репозитория
app.use(express.static(__dirname, { extensions: ['html'] }));

// HTTP endpoint для Android/Windows (и для iOS-фетча)
// /sub?id=N -> text/plain с N-й строкой vless (1..LIST.length)
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

// Health
app.get('/health', (req, res) => res.send('ok'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on :${PORT}`));

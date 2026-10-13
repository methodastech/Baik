'use strict';
// Local test server: serves the site and the /api/auth/* routes on http://localhost:4280
// with no Azure tools installed. Accounts go to api/.data/users.json (git-ignored).
//   node api/dev-server.js
process.env.BAIK_DEV = '1';
const http = require('http');
const fs = require('fs');
const path = require('path');
// local secrets (ToyyibPay keys) from api/.env, which git ignores. KEY=value per line.
try {
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/).forEach(l => {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
} catch (e) { /* no api/.env: run without payments */ }
const auth = require('./src/auth');
const pay = require('./src/pay');
const HANDLERS = Object.assign({}, auth, { payCreate: auth.helpers.wrap(pay.create), payCallback: auth.helpers.wrap(pay.callback), payStatus: auth.helpers.wrap(pay.status) });

const ROOT = path.resolve(__dirname, '..');
const PORT = +process.env.PORT || 4280;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml', '.mp3': 'audio/mpeg' };
const ROUTES = { 'POST /api/pay/create': 'payCreate', 'POST /api/pay/callback': 'payCallback', 'GET /api/pay/status': 'payStatus', 'GET /api/sync': 'sync', 'PUT /api/sync': 'sync', 'POST /api/auth/register': 'register', 'POST /api/auth/login': 'login', 'POST /api/auth/logout': 'logout', 'GET /api/auth/me': 'me' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  res.on('finish', () => { if (process.env.LOG) console.log(new Date().toISOString().slice(11, 23), req.method, url.pathname + url.search, res.statusCode, req.headers.cookie ? 'cookie' : '-'); });
  if (url.pathname.startsWith('/api/')) {
    const name = ROUTES[`${req.method} ${url.pathname}`];
    if (!name) { res.writeHead(404, { 'Content-Type': 'application/json' }); return res.end('{"error":"Not found"}'); }
    const chunks = []; for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString();
    const r = await HANDLERS[name]({ method: req.method, query: url.searchParams, headers: { get: k => req.headers[k.toLowerCase()] || null }, json: async () => JSON.parse(raw || '{}'), text: async () => raw });
    const headers = { 'Content-Type': r.body !== undefined ? 'text/plain' : 'application/json', ...(r.headers || {}) };
    // plain http on localhost: Firefox and Safari drop "Secure" cookies here, so leave the flag off locally only
    if (headers['Set-Cookie']) headers['Set-Cookie'] = headers['Set-Cookie'].replace('; Secure', '');
    res.writeHead(r.status || 200, headers);
    return res.end(r.body !== undefined ? String(r.body) : JSON.stringify(r.jsonBody || {}));
  }
  let file = path.join(ROOT, decodeURIComponent(url.pathname));
  if (!file.startsWith(ROOT) || file.startsWith(path.join(ROOT, 'api'))) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) file = path.join(ROOT, 'index.html'); // same fallback as staticwebapp.config.json
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Baik local server: http://localhost:${PORT}  (accounts saved in api/.data/users.json)`));

'use strict';
/* Prayer and adhkar reminders by web push.
 *
 *   GET  /api/push/key          the public VAPID key the browser subscribes with
 *   POST /api/push/subscribe    { sub, zone, prefs, lang }: save or update this device's reminders
 *   POST /api/push/unsubscribe  { endpoint }
 *   POST /api/push/test         { endpoint }: one notification now, to check it arrives
 *   GET  /api/push/tick?key=…   send whatever is due this minute. Static Web Apps functions only run
 *                               when called, so an outside timer calls this once a minute
 *                               (cron-job.org or similar); PUSH_TICK_SECRET guards it.
 *
 * Times are JAKIM's, fetched per zone from e-solat a week at a time and cached in the store, so a
 * thousand subscribers in WLY01 cost one e-solat request a week. A reminder counts as due for ten
 * minutes after its moment, so a late or skipped timer call still delivers it once (never twice:
 * each subscription remembers what it has been sent today).
 *
 * App settings: VAPID_PUBLIC, VAPID_PRIVATE (api/tools/vapid-keys.js prints a pair), VAPID_SUBJECT
 * (mailto:…), PUSH_TICK_SECRET. Locally (BAIK_DEV) a key pair is made once in api/.data/vapid.json. */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const webpush = require('web-push');
const store = require('./store');

/* ---------- keys ---------- */
function vapid() {
  let pub = process.env.VAPID_PUBLIC, priv = process.env.VAPID_PRIVATE;
  if ((!pub || !priv) && process.env.BAIK_DEV === '1') {
    const f = path.join(__dirname, '..', '.data', 'vapid.json');
    let k = null; try { k = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { /* none yet */ }
    if (!k) { const g = webpush.generateVAPIDKeys(); k = { pub: g.publicKey, priv: g.privateKey }; fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(k)); }
    pub = k.pub; priv = k.priv;
  }
  if (!pub || !priv) { const e = new Error('Reminders are not set up on the server yet.'); e.status = 503; throw e; }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:hello@baikapp.com', pub, priv);
  return pub;
}

/* ---------- JAKIM times, per zone, cached a week at a time ---------- */
const MMON = { jan: 1, feb: 2, mac: 3, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7, ogo: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, dis: 12, dec: 12 };
const dayMY = (off = 0) => new Date(Date.now() + 8 * 36e5 + off * 864e5).toISOString().slice(0, 10);
function parseMY(s) {
  const p = String(s || '').split('-'); if (p.length !== 3) return '';
  const mon = MMON[p[1].toLowerCase().slice(0, 3)]; if (!mon) return '';
  return p[2] + '-' + String(mon).padStart(2, '0') + '-' + p[0].padStart(2, '0');
}
const stamp = (hms, ymd) => { const d = ymd.split('-').map(Number), t = hms.split(':').map(Number); return Date.UTC(d[0], d[1] - 1, d[2], t[0] - 8, t[1] || 0, t[2] || 0); };
const KEYS = ['fajr', 'syuruk', 'dhuhr', 'asr', 'maghrib', 'isha'];
const ZONE_RE = /^[A-Z]{3}\d{2}$/;
async function zoneDay(zone, ymd, memo) {
  if (memo[zone] === undefined) {
    let z = await store.getZone(zone);
    if (!z || !z.days || !z.days[ymd] || Date.now() - (z.fetched || 0) > 3 * 864e5) {
      try {
        const r = await fetch('https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=week&zone=' + encodeURIComponent(zone), { signal: AbortSignal.timeout(8000) });
        const j = await r.json(), list = j && j.prayerTime;
        if (list && list.length) {
          z = { fetched: Date.now(), days: {} };
          list.forEach(p => { const d = parseMY(p.date); if (!d) return; z.days[d] = {}; KEYS.forEach(k => { if (p[k]) z.days[d][k] = stamp(p[k], d); }); });
          await store.putZone(zone, z);
        }
      } catch (e) { /* e-solat unreachable: use what is cached, if anything */ }
    }
    memo[zone] = z;
  }
  return memo[zone] && memo[zone].days ? memo[zone].days[ymd] || null : null;
}

/* ---------- what to say ---------- */
const NAMES = { fajr: ['Fajr', 'Subuh'], dhuhr: ['Dhuhr', 'Zohor'], asr: ['Asr', 'Asar'], maghrib: ['Maghrib', 'Maghrib'], isha: ['Isha', 'Isyak'] };
function clock(ms) {   // 1:02 pm in Malaysian time
  const d = new Date(ms + 8 * 36e5), h = d.getUTCHours(), m = String(d.getUTCMinutes()).padStart(2, '0');
  return ((h + 11) % 12 + 1) + ':' + m + (h < 12 ? ' am' : ' pm');
}
function events(day, prefs, bm) {
  const out = [], lead = Math.max(0, Math.min(30, Number(prefs.lead) || 0));
  Object.keys(NAMES).forEach(k => {
    if (!prefs.p || !prefs.p[k] || !day[k]) return;
    const n = NAMES[k][bm ? 1 : 0];
    out.push({ id: k, at: day[k] - lead * 6e4, url: '/prayer-times', tag: 'baik-' + k,
      title: n + ' · ' + clock(day[k]),
      body: lead ? (bm ? n + ' dalam ' + lead + ' minit.' : n + ' in ' + lead + ' minutes.') : (bm ? 'Telah masuk waktu ' + n + '.' : 'It is time for ' + n + '.') });
  });
  // the adhkar: morning before the sun rises, evening as the afternoon turns
  if (prefs.am && day.syuruk) out.push({ id: 'am', at: day.syuruk - 40 * 6e4, url: '/khayr', tag: 'baik-am',
    title: bm ? 'Zikir pagi' : 'Morning adhkar', body: bm ? 'Sebelum matahari terbit: beberapa minit untuk zikir pagi.' : 'Before the sun rises: a few minutes with the morning adhkar.' });
  if (prefs.pm && day.asr) out.push({ id: 'pm', at: day.asr + 30 * 6e4, url: '/khayr', tag: 'baik-pm',
    title: bm ? 'Zikir petang' : 'Evening adhkar', body: bm ? 'Petang menjelang: masa untuk zikir petang.' : 'The afternoon is turning: time for the evening adhkar.' });
  return out;
}

/* ---------- endpoints ---------- */
const json = (status, body) => ({ status, jsonBody: body, headers: { 'Cache-Control': 'no-store' } });
const bad = msg => { const e = new Error(msg); e.status = 400; throw e; };
const idOf = endpoint => crypto.createHash('sha256').update(endpoint).digest('hex').slice(0, 40);
// only the browsers' own push services: nothing else can be made to receive a request from us
const PUSH_HOSTS = [/(^|\.)fcm\.googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /\.notify\.windows\.com$/, /(^|\.)push\.apple\.com$/];
function checkSub(sub) {
  if (!sub || typeof sub.endpoint !== 'string' || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) bad('That subscription is incomplete.');
  let u; try { u = new URL(sub.endpoint); } catch (e) { bad('That subscription address is not valid.'); }
  if (u.protocol !== 'https:' || !PUSH_HOSTS.some(r => r.test(u.hostname))) bad('That push service is not one we send to.');
  return { endpoint: sub.endpoint, keys: { p256dh: String(sub.keys.p256dh), auth: String(sub.keys.auth) } };
}
function cleanPrefs(p) {
  p = p || {}; const o = { p: {}, am: !!p.am, pm: !!p.pm, lead: [0, 5, 10, 15].includes(Number(p.lead)) ? Number(p.lead) : 0 };
  Object.keys(NAMES).forEach(k => { o.p[k] = !!(p.p && p.p[k]); });
  return o;
}
async function send(s, payload) {
  try { await webpush.sendNotification(s.sub, JSON.stringify(payload), { TTL: 600, urgency: 'high' }); return true; }
  catch (e) { if (e.statusCode === 404 || e.statusCode === 410) { await store.delPush(s.id); return false; } throw e; }
}

async function key() { return json(200, { key: vapid() }); }

async function subscribe(req) {
  vapid();
  const b = await req.json().catch(() => ({}));
  const sub = checkSub(b.sub), zone = String(b.zone || '').toUpperCase();
  if (!ZONE_RE.test(zone)) bad('Pick a JAKIM zone first.');
  const id = idOf(sub.endpoint), old = await store.getPush(id);
  await store.putPush({ id, sub, zone, prefs: cleanPrefs(b.prefs), lang: b.lang === 'bm' ? 'bm' : 'en', sent: old && old.sent || {}, at: new Date().toISOString() });
  return json(200, { ok: true });
}

async function unsubscribe(req) {
  const b = await req.json().catch(() => ({}));
  if (typeof b.endpoint === 'string') await store.delPush(idOf(b.endpoint));
  return json(200, { ok: true });
}

async function test(req) {
  vapid();
  const b = await req.json().catch(() => ({}));
  const s = typeof b.endpoint === 'string' ? await store.getPush(idOf(b.endpoint)) : null;
  if (!s) bad('Turn reminders on first.');
  const bm = s.lang === 'bm';
  const ok = await send(s, { title: bm ? 'Peringatan Baik sudah aktif' : 'Baik reminders are on', body: bm ? 'Begini rupa peringatan waktu solat anda.' : 'This is how your prayer reminders will look.', url: '/prayer-times', tag: 'baik-test' });
  return json(ok ? 200 : 410, ok ? { ok: true } : { error: 'This device is no longer subscribed. Turn reminders on again.' });
}

async function tick(req) {
  const secret = process.env.PUSH_TICK_SECRET;
  const given = (req.query && req.query.get && req.query.get('key')) || (req.headers && req.headers.get && req.headers.get('x-baik-tick')) || '';
  if (process.env.BAIK_DEV !== '1' && (!secret || given !== secret)) return json(403, { error: 'Not allowed.' });
  vapid();
  const now = Date.now(), today = dayMY(), memo = {}, subs = await store.listPush();
  let sent = 0, gone = 0;
  for (const s of subs) {
    const day = await zoneDay(s.zone, today, memo); if (!day) continue;
    const done = s.sent && s.sent.day === today ? s.sent : { day: today, ids: [] };
    const due = events(day, s.prefs || {}, s.lang === 'bm').filter(e => e.at <= now && now - e.at < 10 * 6e4 && !done.ids.includes(e.id));
    if (!due.length) continue;
    let alive = true;
    for (const e of due) {
      try { if (!(await send(s, { title: e.title, body: e.body, url: e.url, tag: e.tag }))) { alive = false; gone++; break; } sent++; }
      catch (err) { /* this push service is having a moment: try again next minute */ continue; }
      done.ids.push(e.id);
    }
    if (alive) { s.sent = done; await store.putPush(s); }
  }
  return json(200, { ok: true, subscribers: subs.length, sent, removed: gone });
}

module.exports = { key, subscribe, unsubscribe, test, tick, _events: events };

'use strict';
// Email + password accounts for Baik.
// Passwords are hashed with scrypt; the session is an HMAC-signed token in an HttpOnly cookie.
const crypto = require('crypto');
const store = require('./store');

const COOKIE = 'baik_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const MAX_FAILS = 8, LOCK_MS = 15 * 60 * 1000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function httpError(status, message) { const e = new Error(message); e.status = status; return e; }

function secret() {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.BAIK_DEV === '1') return 'baik-local-dev-secret-never-use-in-production';
  throw httpError(500, 'Sign-in is not set up on the server yet (AUTH_SECRET is missing).');
}

/* ---------- session token ---------- */
function hmac(body) { return crypto.createHmac('sha256', secret()).update(body).digest('base64url'); }
function signToken(payload) { const body = Buffer.from(JSON.stringify(payload)).toString('base64url'); return body + '.' + hmac(body); }
function readToken(tok) {
  if (!tok || tok.indexOf('.') < 0) return null;
  const [body, sig] = tok.split('.');
  const a = Buffer.from(sig || ''), b = Buffer.from(hmac(body));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let p; try { p = JSON.parse(Buffer.from(body, 'base64url').toString()); } catch { return null; }
  return p && p.exp > Date.now() / 1000 ? p : null;
}
function cookie(value, maxAge) { return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`; }
function cookieFrom(headers) { const m = (headers.get('cookie') || '').match(/(?:^|;\s*)baik_session=([^;]+)/); return m ? m[1] : null; }

/* ---------- passwords ---------- */
function scrypt(pw, salt, o = SCRYPT) { return new Promise((res, rej) => crypto.scrypt(pw, salt, 64, o, (e, k) => e ? rej(e) : res(k))); }
async function hashPassword(pw) {
  const salt = crypto.randomBytes(16), k = await scrypt(pw, salt);
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), k.toString('base64')].join('$');
}
async function checkPassword(pw, stored) {
  const [alg, N, r, p, salt, hash] = String(stored).split('$');
  if (alg !== 'scrypt') return false;
  const k = await scrypt(pw, Buffer.from(salt, 'base64'), { N: +N, r: +r, p: +p, maxmem: SCRYPT.maxmem });
  const h = Buffer.from(hash, 'base64');
  return h.length === k.length && crypto.timingSafeEqual(h, k);
}
// compared against when the email is unknown, so a miss costs the same time as a wrong password
let DUMMY = null;
async function dummyHash() { return DUMMY || (DUMMY = await hashPassword(crypto.randomBytes(12).toString('hex'))); }

/* ---------- helpers ---------- */
async function readJson(req) {
  if (!/application\/json/i.test(req.headers.get('content-type') || '')) throw httpError(415, 'Send the form as JSON.');
  try { return (await req.json()) || {}; } catch { throw httpError(400, 'That request could not be read.'); }
}
const normEmail = e => String(e || '').trim().toLowerCase();
/* Premium as the server knows it: paid through ToyyibPay, never set by the browser */
const premiumOf = u => (u.premiumLife || (u.premiumUntil || 0) > Date.now())
  ? { plan: u.premiumPlan || '', until: u.premiumLife ? null : u.premiumUntil, life: !!u.premiumLife } : null;
const publicUser = u => ({ name: u.name, email: u.email, createdAt: u.createdAt, premium: premiumOf(u) });
async function sessionUser(req) { const p = readToken(cookieFrom(req.headers)); return p ? store.get(p.e) : null; }
function signedIn(u, status = 200) {
  const now = Math.floor(Date.now() / 1000);
  return {
    status, jsonBody: { user: publicUser(u) },
    headers: { 'Set-Cookie': cookie(signToken({ e: u.email, iat: now, exp: now + MAX_AGE }), MAX_AGE), 'Cache-Control': 'no-store' },
  };
}

/* ---------- handlers ---------- */
async function register(req) {
  const b = await readJson(req);
  const name = String(b.name || '').trim().replace(/\s+/g, ' ');
  const email = normEmail(b.email), pw = String(b.password || '');
  if (!name || name.length > 60) throw httpError(400, 'Please enter your name (up to 60 characters).');
  if (email.length > 254 || !EMAIL.test(email)) throw httpError(400, 'Please enter a valid email address.');
  if (pw.length < 8 || pw.length > 128) throw httpError(400, 'Your password needs 8 to 128 characters.');
  const taken = 'An account with this email already exists. Try signing in instead.';
  if (await store.get(email)) throw httpError(409, taken);
  const u = { email, name, hash: await hashPassword(pw), createdAt: new Date().toISOString(), failed: 0, lockUntil: 0 };
  if (!(await store.create(u))) throw httpError(409, taken);
  return signedIn(u, 201);
}

async function login(req) {
  const b = await readJson(req);
  const email = normEmail(b.email), pw = String(b.password || '');
  const u = email ? await store.get(email) : null;
  if (u && u.lockUntil > Date.now()) throw httpError(429, 'Too many wrong attempts. Please try again in 15 minutes.');
  const ok = await checkPassword(pw, u ? u.hash : await dummyHash());
  if (!u || !ok) {
    if (u) {
      u.failed = (u.failed || 0) + 1;
      if (u.failed >= MAX_FAILS) { u.lockUntil = Date.now() + LOCK_MS; u.failed = 0; }
      await store.update(u);
    }
    throw httpError(401, 'That email or password is not right.');
  }
  if (u.failed || u.lockUntil) { u.failed = 0; u.lockUntil = 0; await store.update(u); }
  return signedIn(u);
}

async function me(req) {
  const p = readToken(cookieFrom(req.headers));
  const u = p ? await store.get(p.e) : null;
  if (!u) return { status: 401, jsonBody: { user: null }, headers: { 'Cache-Control': 'no-store' } };
  return { status: 200, jsonBody: { user: publicUser(u) }, headers: { 'Cache-Control': 'no-store' } };
}

/* GET /api/sync returns the signed-in user's synced data; PUT replaces it. The client merges before it puts. */
const SYNC_MAX = 600 * 1024;
async function sync(req) {
  const p = readToken(cookieFrom(req.headers));
  const u = p ? await store.get(p.e) : null;
  if (!u) throw httpError(401, 'Please sign in again.');
  const nocache = { 'Cache-Control': 'no-store' };
  if (req.method === 'GET') {
    const s = await store.getBlob(u.email);
    return { status: 200, jsonBody: s ? JSON.parse(s) : { data: null }, headers: nocache };
  }
  const b = await readJson(req);
  if (!b || b.app !== 'baik' || typeof b.data !== 'object' || !b.data) throw httpError(400, 'That is not Baik data.');
  const s = JSON.stringify({ app: 'baik', v: 1, at: new Date().toISOString(), data: b.data });
  if (s.length > SYNC_MAX) throw httpError(413, 'Your data is too large to sync (over 600 KB).');
  await store.putBlob(u.email, s);
  return { status: 200, jsonBody: { ok: true, at: new Date().toISOString() }, headers: nocache };
}

async function logout() {
  return { status: 200, jsonBody: { ok: true }, headers: { 'Set-Cookie': cookie('', 0), 'Cache-Control': 'no-store' } };
}

function wrap(fn) {
  return async (req, ctx) => {
    try { return await fn(req); }
    catch (e) {
      if (!e.status || e.status >= 500) (ctx && ctx.error ? ctx.error : console.error)(e);
      return { status: e.status || 500, jsonBody: { error: e.status ? e.message : 'Something went wrong on our side. Please try again.' }, headers: { 'Cache-Control': 'no-store' } };
    }
  };
}

module.exports = {
  helpers: { httpError, readJson, sessionUser, publicUser, premiumOf, wrap: f => wrap(f) }, register: wrap(register), login: wrap(login), me: wrap(me), logout: wrap(logout), sync: wrap(sync) };

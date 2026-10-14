'use strict';
// Email + password accounts for Baik.
// Passwords are hashed with scrypt; the session is an HMAC-signed token in an HttpOnly cookie.
const crypto = require('crypto');
const store = require('./store');
const mail = require('./mail');

const COOKIE = 'baik_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const MAX_FAILS = 8, LOCK_MS = 15 * 60 * 1000;
const VERIFY = 'verify';
const RESET = 'reset';
const RESET_AGE = 60 * 60; // a reset link is good for an hour, not a day
const TRIAL_DAYS = 7;
const MAIL_GAP_MS = 60 * 1000; // one automated email per account per minute
const VERIFY_AGE = 60 * 60 * 24; // a confirmation link is good for a day
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
/* A link mailed to an address proves only that address. Giving every such link a
   purpose, and refusing any token that carries one wherever a session is expected,
   stops a confirmation link from being pasted in as a session cookie. */
function purposeToken(email, purpose, ttl) {
  const now = Math.floor(Date.now() / 1000);
  return signToken({ e: email, p: purpose, iat: now, exp: now + ttl });
}
function readPurpose(tok, purpose) { const p = readToken(tok); return p && p.p === purpose ? p : null; }
/* The reset email promises the link works once. A signed token on its own stays
   valid until it expires, so it carries a fingerprint of the password hash it was
   issued against: the moment that password changes, every link issued before it
   stops matching. Signing in again does not invalidate anything, only a change does. */
/* Both /forgot and /resend will send mail to an address on request, which is a way
   to flood someone's inbox at our expense. A per-account cooldown stops that without
   changing the answer, so it still says nothing about whether the account exists. */
async function mailAllowed(u) {
  const now = Date.now();
  if ((u.lastMailAt || 0) + MAIL_GAP_MS > now) return false;
  u.lastMailAt = now;
  await store.update(u);
  return true;
}

function pwStamp(hash) { return crypto.createHmac('sha256', secret()).update(String(hash)).digest('base64url').slice(0, 16); }
function resetToken(u) {
  const now = Math.floor(Date.now() / 1000);
  return signToken({ e: u.email, p: RESET, k: pwStamp(u.hash), iat: now, exp: now + RESET_AGE });
}
const readSession = tok => { const p = readToken(tok); return p && !p.p ? p : null; };

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
/* Premium as the server knows it. A trial is premium too, but only while its own
   clock says so: nothing has to run to end one, because an expired trial simply
   stops matching here. */
const premiumOf = u => {
  if (u.premiumLife) return { plan: u.premiumPlan || 'life', until: null, life: true, trial: false };
  if ((u.premiumUntil || 0) > Date.now()) return { plan: u.premiumPlan || '', until: u.premiumUntil, life: false, trial: false };
  if ((u.trialUntil || 0) > Date.now()) return { plan: 'trial', until: u.trialUntil, life: false, trial: true };
  return null;
};
const publicUser = u => ({ name: u.name, email: u.email, createdAt: u.createdAt, premium: premiumOf(u) });
async function sessionUser(req) { const p = readSession(cookieFrom(req.headers)); return p ? store.get(p.e) : null; }
function signedIn(u, status = 200) {
  const now = Math.floor(Date.now() / 1000);
  return {
    status, jsonBody: { user: publicUser(u) },
    headers: { 'Set-Cookie': cookie(signToken({ e: u.email, iat: now, exp: now + MAX_AGE }), MAX_AGE), 'Cache-Control': 'no-store' },
  };
}

/* ---------- handlers ---------- */

/* Opened from a mail client, so it answers with a redirect rather than JSON:
   whatever happened, the person lands on the sign-in page and is told there. */
async function verify(req) {
  const q = req.query || new URL(req.url).searchParams;
  const token = q.get('token') || '';
  const back = q => ({ status: 302, headers: { Location: mail.base() + '/login?' + q, 'Cache-Control': 'no-store' } });
  const p = readPurpose(token, VERIFY);
  if (!p) return back('confirm=expired');
  const u = await store.get(p.e);
  if (!u) return back('confirm=expired');
  if (u.verified !== true) { u.verified = true; await store.update(u); }
  return back('confirm=ok&email=' + encodeURIComponent(u.email));
}

/* One trial per account, ever. It used to live in localStorage, which meant a
   cleared browser bought another seven days, forever, for anyone who asked. */
async function trial(req) {
  const u = await sessionUser(req);
  if (!u) throw httpError(401, 'Please sign in again.');
  /* Stopping is allowed any time, and does not hand the trial back: trialStarted
     stays set, so the account cannot take a second one. */
  const body = await readJson(req).catch(() => ({}));
  if (body && body.stop) {
    if (u.trialUntil) { u.trialUntil = 0; await store.update(u); }
    return { status: 200, jsonBody: { user: publicUser(u) }, headers: { 'Cache-Control': 'no-store' } };
  }
  if (premiumOf(u)) throw httpError(409, 'Premium is already open on this account.');
  if (u.trialStarted) throw httpError(409, 'This account has already used its free trial.');
  u.trialStarted = new Date().toISOString();
  u.trialUntil = Date.now() + TRIAL_DAYS * 864e5;
  await store.update(u);
  return { status: 200, jsonBody: { user: publicUser(u) }, headers: { 'Cache-Control': 'no-store' } };
}

/* Same answer whatever happened, for the same reason as resend below. */
async function forgot(req) {
  const b = await readJson(req);
  const email = normEmail(b.email);
  const same = {
    status: 200,
    jsonBody: { ok: true, message: 'If that address has an account, a link to set a new password is on its way.' },
    headers: { 'Cache-Control': 'no-store' },
  };
  if (!EMAIL.test(email)) return same;
  const u = await store.get(email);
  if (!u) return same;
  if (!(await mailAllowed(u))) return same;
  try { await mail.sendReset(email, u.name, resetToken(u)); }
  catch (e) { console.error('reset email failed for ' + email + ': ' + (e && e.message)); }
  return same;
}

async function reset(req) {
  const b = await readJson(req);
  const dead = () => httpError(400, 'That reset link has expired or has already been used. Please ask for a new one.');
  const p = readPurpose(String(b.token || ''), RESET);
  if (!p) throw dead();
  const pw = String(b.password || '');
  if (pw.length < 8 || pw.length > 128) throw httpError(400, 'Your password needs 8 to 128 characters.');
  const u = await store.get(p.e);
  if (!u || p.k !== pwStamp(u.hash)) throw dead();
  u.hash = await hashPassword(pw);
  u.failed = 0; u.lockUntil = 0;
  /* Opening the link proved the address, so a reset confirms it too: otherwise
     someone who never opened the first email could never get in at all. */
  if (u.verified === false) u.verified = true;
  await store.update(u);
  return signedIn(u);
}

/* Always the same answer. Saying "no such account" here would turn this into a
   way to ask the server which addresses are registered. */
async function resend(req) {
  const b = await readJson(req);
  const email = normEmail(b.email);
  const same = {
    status: 200,
    jsonBody: { ok: true, message: 'If that address is waiting to be confirmed, a new link is on its way.' },
    headers: { 'Cache-Control': 'no-store' },
  };
  if (!EMAIL.test(email)) return same;
  const u = await store.get(email);
  if (!u || u.verified !== false) return same;
  if (!(await mailAllowed(u))) return same;
  try { await mail.sendVerification(email, u.name, purposeToken(email, VERIFY, VERIFY_AGE)); } catch { /* reported the same either way */ }
  return same;
}
async function register(req) {
  const b = await readJson(req);
  const name = String(b.name || '').trim().replace(/\s+/g, ' ');
  const email = normEmail(b.email), pw = String(b.password || '');
  if (!name || name.length > 60) throw httpError(400, 'Please enter your name (up to 60 characters).');
  if (email.length > 254 || !EMAIL.test(email)) throw httpError(400, 'Please enter a valid email address.');
  if (pw.length < 8 || pw.length > 128) throw httpError(400, 'Your password needs 8 to 128 characters.');
  const taken = 'An account with this email already exists. Try signing in instead.';
  if (await store.get(email)) throw httpError(409, taken);
  const u = { email, name, hash: await hashPassword(pw), createdAt: new Date().toISOString(), failed: 0, lockUntil: 0, verified: false, lastMailAt: Date.now() };
  if (!(await store.create(u))) throw httpError(409, taken);
  /* The account is kept whether or not the message leaves: an outage at the mail
     provider must not cost someone their registration. What it changes is only
     what we tell them to do next, so the reply says which of the two happened. */
  let sent = true;
  try { await mail.sendVerification(email, name, purposeToken(email, VERIFY, VERIFY_AGE)); }
  catch (e) { sent = false; console.error('verification email failed for ' + email + ': ' + (e && e.message)); }
  return {
    status: 201,
    jsonBody: {
      pending: true, email, sent,
      message: sent
        ? "Almost there. Open the link we sent to " + email + " to confirm your account."
        : "Your account is made, but the confirmation email could not be sent just now. Use Resend in a moment.",
    },
    headers: { 'Cache-Control': 'no-store' },
  };
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
  /* Accounts made before confirmation existed have no flag at all; only an
     explicit false means the address was never confirmed. */
  if (u.verified === false) { const e = httpError(403, 'Please confirm your email first. Check your inbox for the link we sent.'); e.unverified = true; throw e; }
  return signedIn(u);
}

async function me(req) {
  const p = readSession(cookieFrom(req.headers));
  const u = p ? await store.get(p.e) : null;
  if (!u) return { status: 401, jsonBody: { user: null }, headers: { 'Cache-Control': 'no-store' } };
  return { status: 200, jsonBody: { user: publicUser(u) }, headers: { 'Cache-Control': 'no-store' } };
}

/* GET /api/sync returns the signed-in user's synced data; PUT replaces it. The client merges before it puts. */
const SYNC_MAX = 600 * 1024;
async function sync(req) {
  const p = readSession(cookieFrom(req.headers));
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
  helpers: { httpError, readJson, sessionUser, publicUser, premiumOf, wrap: f => wrap(f) }, register: wrap(register), login: wrap(login), verify: wrap(verify), resend: wrap(resend), forgot: wrap(forgot), reset: wrap(reset), trial: wrap(trial), me: wrap(me), logout: wrap(logout), sync: wrap(sync) };

'use strict';
// Baik Premium payments through ToyyibPay (FPX online banking and cards, Malaysia).
//   POST /api/pay/create    {plan, phone?}  signed in -> creates a ToyyibPay bill, returns {url, order}
//   POST /api/pay/callback  ToyyibPay's server-to-server notice (form post) -> verifies, unlocks
//   GET  /api/pay/status?order=ID           signed in -> verifies if still pending, returns status + premium
// Nothing the browser or the callback says is trusted: every order is checked against ToyyibPay's own
// getBillTransactions before Premium is granted, and prices live here, not in the page.
const crypto = require('crypto');
const store = require('./store');
const { httpError, readJson, sessionUser, premiumOf } = require('./auth').helpers;

const PLANS = {
  month: { label: 'Monthly', cents: 1990, days: 30 },
  annual: { label: 'Annual', cents: 17910, days: 365 },
  life: { label: 'Lifetime', cents: 35820, days: null },
  /* The launch offer the Free vs Premium table promises: lifetime access at a
     lower price, for the first FOUNDING_SEATS people who actually pay. */
  founding: { label: 'Founding Member', cents: 12990, days: null },
};
const FOUNDING_SEATS = 1000;

/* Seats are counted from paid orders, not from bills created, so an abandoned
   checkout never holds one. Two people paying at the same instant could take the
   same last seat; one extra founding member is a better outcome than a lost sale. */
async function foundingLeft() { return Math.max(0, FOUNDING_SEATS - await store.foundingCount()); }

function config() {
  const secret = process.env.TOYYIBPAY_SECRET, category = process.env.TOYYIBPAY_CATEGORY;
  if (!secret || !category) throw httpError(503, 'Payments are not set up yet (TOYYIBPAY_SECRET and TOYYIBPAY_CATEGORY are missing on the server).');
  const base = (process.env.TOYYIBPAY_BASE || (process.env.TOYYIBPAY_ENV === 'live' ? 'https://toyyibpay.com' : 'https://dev.toyyibpay.com')).replace(/\/$/, '');
  return { secret, category, base };
}
// where ToyyibPay sends the payer back, and where it posts the callback
function origin(req) {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  const h = n => req.headers.get(n);
  const host = h('x-forwarded-host') || h('host');
  const proto = h('x-forwarded-proto') || (/^(localhost|127\.)/.test(host || '') ? 'http' : 'https');
  return proto + '://' + host;
}
async function tpPost(base, path, fields) {
  const r = await fetch(base + '/index.php/api/' + path, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fields).toString(),
  });
  const text = await r.text();
  try { return JSON.parse(text); } catch { throw httpError(502, 'ToyyibPay answered unexpectedly: ' + text.slice(0, 160)); }
}
// ToyyibPay accepts only letters, numbers, spaces and underscores in a bill's name and description
const clean = (s, n) => String(s).replace(/[^A-Za-z0-9 _]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

async function create(req) {
  const u = await sessionUser(req);
  if (!u) throw httpError(401, 'Please sign in again.');
  const b = await readJson(req);
  const plan = PLANS[b.plan];
  if (!plan) throw httpError(400, 'Choose Monthly, Annual, Lifetime or Founding Member.');
  /* checked before the bill exists, so nobody pays for a seat that has gone */
  if (b.plan === 'founding' && !(await foundingLeft())) {
    throw httpError(409, 'All 1,000 Founding Member places have been taken. Lifetime access is still available.');
  }
  // ToyyibPay refuses a bill without the payer's phone number
  const phone = String(b.phone || '').replace(/[^\d+]/g, '').slice(0, 15);
  if (phone.replace(/\D/g, '').length < 9) throw httpError(400, 'Please enter your phone number. ToyyibPay needs it for the receipt.');
  const { secret, category, base } = config();
  const id = 'BK' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(3).toString('hex').toUpperCase();
  const site = origin(req);
  const res = await tpPost(base, 'createBill', {
    userSecretKey: secret, categoryCode: category,
    billName: clean('Baik Premium ' + plan.label, 30),
    billDescription: clean('Baik Premium ' + plan.label + (plan.days ? ' ' + plan.days + ' days' : ' lifetime') + ' order ' + id, 100),
    billPriceSetting: '1', billPayorInfo: '1', billAmount: String(plan.cents),
    billReturnUrl: site + '/khayr?pay=return&order=' + id,
    billCallbackUrl: site + '/api/pay/callback',
    billExternalReferenceNo: id,
    billTo: u.name, billEmail: u.email, billPhone: phone,
    billSplitPayment: '0', billSplitPaymentArgs: '',
    billPaymentChannel: '2',                       // FPX and card
    billContentEmail: 'Thank you for supporting Baik. Your Premium is unlocked on your account.',
    billChargeToCustomer: '',                      // the fee is Baik's, not the payer's
  });
  const code = Array.isArray(res) && res[0] && res[0].BillCode;
  if (!code) throw httpError(502, 'ToyyibPay did not create the bill: ' + JSON.stringify(res).slice(0, 200));
  await store.putOrder({ id, email: u.email, plan: b.plan, cents: plan.cents, billCode: code, status: 'pending', createdAt: new Date().toISOString() });
  return { status: 200, jsonBody: { url: base + '/' + code, order: id }, headers: { 'Cache-Control': 'no-store' } };
}

/* ask ToyyibPay whether this order's bill was paid, in full, for this order */
async function verify(order) {
  if (order.status === 'paid') return order;
  const { base } = config();
  const tx = await tpPost(base, 'getBillTransactions', { billCode: order.billCode });
  const list = Array.isArray(tx) ? tx : [];
  const paid = list.find(t => String(t.billpaymentStatus) === '1'
    && (!t.billExternalReferenceNo || t.billExternalReferenceNo === order.id)
    && Math.round(parseFloat(t.billpaymentAmount) * 100) === order.cents);
  if (paid) return markPaid(order, paid);
  if (list.length && list.every(t => String(t.billpaymentStatus) === '3') && order.status !== 'failed') {
    order.status = 'failed'; await store.putOrder(order);
  }
  return order;
}
async function markPaid(order, tx) {
  const fresh = await store.getOrder(order.id);           // another request may have just done it
  if (fresh && fresh.status === 'paid') return fresh;
  order.status = 'paid'; order.paidAt = new Date().toISOString();
  order.ref = tx.billpaymentInvoiceNo || tx.billpaymentRefNo || '';
  await store.putOrder(order);
  const u = await store.get(order.email);
  if (u) {
    const plan = PLANS[order.plan];
    if (!plan.days) u.premiumLife = true;
    else u.premiumUntil = Math.max(Date.now(), u.premiumUntil || 0) + plan.days * 864e5;   // renewing early adds on
    u.premiumPlan = u.premiumLife ? 'life' : order.plan;
    await store.update(u);
    if (order.plan === 'founding') await store.bumpFounding();
  }
  return order;
}

/* What the premium sheet asks before it prints a price. Public on purpose: it
   says only how many founding places are left, which the offer itself advertises. */
async function offer() {
  const left = await foundingLeft();
  return {
    status: 200,
    jsonBody: { founding: { left, seats: FOUNDING_SEATS, amount: (PLANS.founding.cents / 100).toFixed(2) } },
    headers: { 'Cache-Control': 'no-store' },
  };
}

async function callback(req) {
  const f = new URLSearchParams(await req.text());
  const id = f.get('order_id') || f.get('billExternalReferenceNo');
  const order = id ? await store.getOrder(id) : null;
  if (order && order.billCode === f.get('billcode')) await verify(order);
  return { status: 200, body: 'OK', headers: { 'Content-Type': 'text/plain' } };
}

async function status(req) {
  const u = await sessionUser(req);
  if (!u) throw httpError(401, 'Please sign in again.');
  const id = req.query.get('order');
  let order = id ? await store.getOrder(id) : null;
  if (!order || order.email !== u.email) throw httpError(404, 'That order was not found.');
  if (order.status === 'pending') order = await verify(order);
  const me = await store.get(u.email);
  return {
    status: 200, headers: { 'Cache-Control': 'no-store' },
    jsonBody: { order: { id: order.id, plan: order.plan, status: order.status, amount: (order.cents / 100).toFixed(2), ref: order.ref || '' }, premium: premiumOf(me) },
  };
}

module.exports = { create, callback, status, PLANS, offer };

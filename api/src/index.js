'use strict';
// Azure Functions entry: POST /api/auth/register, /api/auth/login, /api/auth/logout, /api/auth/resend, /api/auth/forgot, /api/auth/reset
//                        GET  /api/auth/me, /api/auth/verify?token=...
const { app } = require('@azure/functions');
const auth = require('./auth');

[['register', 'POST'], ['login', 'POST'], ['logout', 'POST'], ['me', 'GET'], ['resend', 'POST'], ['verify', 'GET'], ['forgot', 'POST'], ['reset', 'POST'], ['trial', 'POST']].forEach(([name, method]) => {
  app.http('auth-' + name, { methods: [method], authLevel: 'anonymous', route: 'auth/' + name, handler: auth[name] });
});
app.http('sync', { methods: ['GET', 'PUT'], authLevel: 'anonymous', route: 'sync', handler: auth.sync });
// ToyyibPay: create a bill, receive its callback, check an order
const pay = require('./pay');
const wrap = auth.helpers.wrap;
app.http('pay-create', { methods: ['POST'], authLevel: 'anonymous', route: 'pay/create', handler: wrap(pay.create) });
app.http('pay-callback', { methods: ['POST'], authLevel: 'anonymous', route: 'pay/callback', handler: wrap(pay.callback) });
app.http('pay-offer', { methods: ['GET'], authLevel: 'anonymous', route: 'pay/offer', handler: wrap(pay.offer) });
app.http('pay-status', { methods: ['GET'], authLevel: 'anonymous', route: 'pay/status', handler: wrap(pay.status) });
// prayer and adhkar reminders (web push); /api/push/tick is called once a minute by an outside timer
const push = require('./push');
app.http('push-key', { methods: ['GET'], authLevel: 'anonymous', route: 'push/key', handler: wrap(push.key) });
app.http('push-subscribe', { methods: ['POST'], authLevel: 'anonymous', route: 'push/subscribe', handler: wrap(push.subscribe) });
app.http('push-unsubscribe', { methods: ['POST'], authLevel: 'anonymous', route: 'push/unsubscribe', handler: wrap(push.unsubscribe) });
app.http('push-test', { methods: ['POST'], authLevel: 'anonymous', route: 'push/test', handler: wrap(push.test) });
app.http('push-tick', { methods: ['GET', 'POST'], authLevel: 'anonymous', route: 'push/tick', handler: wrap(push.tick) });

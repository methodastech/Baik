'use strict';
// Azure Functions entry: POST /api/auth/register, /api/auth/login, /api/auth/logout and GET /api/auth/me
const { app } = require('@azure/functions');
const auth = require('./auth');

[['register', 'POST'], ['login', 'POST'], ['logout', 'POST'], ['me', 'GET']].forEach(([name, method]) => {
  app.http('auth-' + name, { methods: [method], authLevel: 'anonymous', route: 'auth/' + name, handler: auth[name] });
});
app.http('sync', { methods: ['GET', 'PUT'], authLevel: 'anonymous', route: 'sync', handler: auth.sync });
// ToyyibPay: create a bill, receive its callback, check an order
const pay = require('./pay');
const wrap = auth.helpers.wrap;
app.http('pay-create', { methods: ['POST'], authLevel: 'anonymous', route: 'pay/create', handler: wrap(pay.create) });
app.http('pay-callback', { methods: ['POST'], authLevel: 'anonymous', route: 'pay/callback', handler: wrap(pay.callback) });
app.http('pay-status', { methods: ['GET'], authLevel: 'anonymous', route: 'pay/status', handler: wrap(pay.status) });

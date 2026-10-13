'use strict';
// Where accounts live.
//  - On Azure: Azure Table Storage, table "baikusers" (app setting AZURE_TABLES_CONNECTION).
//  - Local testing (BAIK_DEV=1, set by api/dev-server.js): a JSON file in api/.data/, never deployed.
const fs = require('fs');
const path = require('path');

const conn = process.env.AZURE_TABLES_CONNECTION;
const key = email => encodeURIComponent(email); // RowKey may not contain / \ # ?

function tableStore() {
  const { TableClient } = require('@azure/data-tables');
  const t = TableClient.fromConnectionString(conn, 'baikusers');
  let ready = null;
  const init = () => ready || (ready = t.createTable().catch(e => { ready = null; if (e.statusCode !== 409) throw e; }));
  const toEnt = u => ({ partitionKey: 'user', rowKey: key(u.email), email: u.email, name: u.name, hash: u.hash, createdAt: u.createdAt, failed: u.failed || 0, lockUntil: u.lockUntil || 0, premiumPlan: u.premiumPlan || '', premiumUntil: u.premiumUntil || 0, premiumLife: !!u.premiumLife });
  const fromEnt = e => ({ email: e.email, name: e.name, hash: e.hash, createdAt: e.createdAt, failed: e.failed || 0, lockUntil: Number(e.lockUntil) || 0, premiumPlan: e.premiumPlan || '', premiumUntil: Number(e.premiumUntil) || 0, premiumLife: !!e.premiumLife });
  return {
    async get(email) {
      await init();
      try { return fromEnt(await t.getEntity('user', key(email))); }
      catch (e) { if (e.statusCode === 404) return null; throw e; }
    },
    async create(u) {
      await init();
      try { await t.createEntity(toEnt(u)); return true; }
      catch (e) { if (e.statusCode === 409) return false; throw e; }
    },
    async update(u) { await init(); await t.updateEntity(toEnt(u), 'Merge'); },
    // payment orders (ToyyibPay bills), one entity each, keyed by our order id
    async getOrder(id) {
      await init();
      try { const e = await t.getEntity('order', key(id)); return JSON.parse(e.data); }
      catch (e) { if (e.statusCode === 404) return null; throw e; }
    },
    async putOrder(o) { await init(); await t.upsertEntity({ partitionKey: 'order', rowKey: key(o.id), email: o.email, status: o.status, data: JSON.stringify(o) }, 'Replace'); },
    // synced app data: one entity per user, the JSON split over p0..pN (a string property holds at most 32K chars)
    async getBlob(email) {
      await init();
      try { const e = await t.getEntity('sync', key(email)); let s = ''; for (let i = 0; i < (e.parts || 0); i++) s += e['p' + i] || ''; return s || null; }
      catch (e) { if (e.statusCode === 404) return null; throw e; }
    },
    async putBlob(email, s) {
      await init();
      const ent = { partitionKey: 'sync', rowKey: key(email), parts: 0, at: new Date().toISOString() };
      for (let i = 0; i * 30000 < s.length; i++) { ent['p' + i] = s.slice(i * 30000, (i + 1) * 30000); ent.parts = i + 1; }
      await t.upsertEntity(ent, 'Replace');
    },
  };
}

function fileStore() {
  const file = path.join(__dirname, '..', '.data', 'users.json');
  const read = () => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; } };
  const write = all => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(all, null, 2)); };
  return {
    async get(email) { return read()[key(email)] || null; },
    async create(u) { const all = read(); if (all[key(u.email)]) return false; all[key(u.email)] = u; write(all); return true; },
    async update(u) { const all = read(); all[key(u.email)] = u; write(all); },
    async getOrder(id) { return (read()._orders || {})[id] || null; },
    async putOrder(o) { const all = read(); (all._orders = all._orders || {})[o.id] = o; write(all); },
    async getBlob(email) { const all = read(); return (all._sync || {})[key(email)] || null; },
    async putBlob(email, s) { const all = read(); (all._sync = all._sync || {})[key(email)] = s; write(all); },
  };
}

function missing() {
  const fail = async () => { const e = new Error('Sign-in is not set up on the server yet (AZURE_TABLES_CONNECTION is missing).'); e.status = 500; throw e; };
  return { get: fail, create: fail, update: fail, getBlob: fail, putBlob: fail, getOrder: fail, putOrder: fail };
}

module.exports = conn ? tableStore() : process.env.BAIK_DEV === '1' ? fileStore() : missing();

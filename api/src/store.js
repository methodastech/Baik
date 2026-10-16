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
  const toEnt = u => ({ partitionKey: 'user', rowKey: key(u.email), email: u.email, name: u.name, hash: u.hash, createdAt: u.createdAt, failed: u.failed || 0, lockUntil: u.lockUntil || 0, premiumPlan: u.premiumPlan || '', premiumUntil: u.premiumUntil || 0, premiumLife: !!u.premiumLife, ...(u.verified === undefined ? {} : { verified: !!u.verified }), trialUntil: u.trialUntil || 0, trialStarted: u.trialStarted || '', lastMailAt: u.lastMailAt || 0 });
  const fromEnt = e => ({ email: e.email, name: e.name, hash: e.hash, createdAt: e.createdAt, failed: e.failed || 0, lockUntil: Number(e.lockUntil) || 0, premiumPlan: e.premiumPlan || '', premiumUntil: Number(e.premiumUntil) || 0, premiumLife: !!e.premiumLife, ...(e.verified === undefined ? {} : { verified: !!e.verified }), trialUntil: Number(e.trialUntil) || 0, trialStarted: e.trialStarted || '', lastMailAt: Number(e.lastMailAt) || 0 });
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
    /* How many founding seats have been taken. One row, read often and written
       rarely. The write uses the row's etag so two people paying at the same
       moment cannot both read 998 and both write 999. */
    async foundingCount() {
      await init();
      try { const e = await t.getEntity('meta', 'founding'); return Number(e.n) || 0; }
      catch (e) { if (e.statusCode === 404) return 0; throw e; }
    },
    async bumpFounding() {
      await init();
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const e = await t.getEntity('meta', 'founding');
          await t.updateEntity({ partitionKey: 'meta', rowKey: 'founding', n: (Number(e.n) || 0) + 1 }, 'Merge', { etag: e.etag });
          return;
        } catch (err) {
          if (err.statusCode === 404) {
            try { await t.createEntity({ partitionKey: 'meta', rowKey: 'founding', n: 1 }); return; }
            catch (e2) { if (e2.statusCode !== 409) throw e2; }   // someone else created it: read again
          } else if (err.statusCode !== 412) throw err;           // 412: etag moved, read again
        }
      }
    },
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
    // reminder subscriptions (one per device) and each JAKIM zone's week of times, as JSON
    async putPush(o) { await init(); await t.upsertEntity({ partitionKey: 'push', rowKey: o.id, data: JSON.stringify(o) }, 'Replace'); },
    async delPush(id) { await init(); try { await t.deleteEntity('push', id); } catch (e) { if (e.statusCode !== 404) throw e; } },
    async getPush(id) {
      await init();
      try { return JSON.parse((await t.getEntity('push', id)).data); }
      catch (e) { if (e.statusCode === 404) return null; throw e; }
    },
    async listPush() {
      await init();
      const out = [];
      for await (const e of t.listEntities({ queryOptions: { filter: "PartitionKey eq 'push'" } })) { try { out.push(JSON.parse(e.data)); } catch (err) { /* skip a broken row */ } }
      return out;
    },
    async getZone(z) {
      await init();
      try { return JSON.parse((await t.getEntity('ptz', key(z))).data); }
      catch (e) { if (e.statusCode === 404) return null; throw e; }
    },
    async putZone(z, o) { await init(); await t.upsertEntity({ partitionKey: 'ptz', rowKey: key(z), data: JSON.stringify(o) }, 'Replace'); },
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
    async foundingCount() { return read()._founding || 0; },
    async bumpFounding() { const all = read(); all._founding = (all._founding || 0) + 1; write(all); },
    async getOrder(id) { return (read()._orders || {})[id] || null; },
    async putOrder(o) { const all = read(); (all._orders = all._orders || {})[o.id] = o; write(all); },
    async getBlob(email) { const all = read(); return (all._sync || {})[key(email)] || null; },
    async putBlob(email, s) { const all = read(); (all._sync = all._sync || {})[key(email)] = s; write(all); },
    async putPush(o) { const all = read(); (all._push = all._push || {})[o.id] = o; write(all); },
    async delPush(id) { const all = read(); if (all._push) delete all._push[id]; write(all); },
    async getPush(id) { return (read()._push || {})[id] || null; },
    async listPush() { return Object.values(read()._push || {}); },
    async getZone(z) { return (read()._ptz || {})[z] || null; },
    async putZone(z, o) { const all = read(); (all._ptz = all._ptz || {})[z] = o; write(all); },
  };
}

function missing() {
  const fail = async () => { const e = new Error('Sign-in is not set up on the server yet (AZURE_TABLES_CONNECTION is missing).'); e.status = 500; throw e; };
  return { get: fail, create: fail, update: fail, getBlob: fail, putBlob: fail, getOrder: fail, putOrder: fail,
    putPush: fail, delPush: fail, getPush: fail, listPush: fail, getZone: fail, putZone: fail };
}

module.exports = conn ? tableStore() : process.env.BAIK_DEV === '1' ? fileStore() : missing();

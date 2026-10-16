/* Baik · prayer and adhkar reminders, the device side. A card in Prayer times turns them on: it asks
   for permission, subscribes this browser for push (the key comes from /api/push/key), and tells the
   server which prayers, which adhkar and how early, for the JAKIM zone chosen above. The server sends
   each reminder at its minute (api/src/push.js); the service worker shows it (sw.js).
   Choices live on this device under baik.remind; every change is sent on to the server. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var box = $('qrm'); if (!box) return;
  var KEY = 'baik.remind';
  var bm = function () { return typeof LANG !== 'undefined' && LANG === 'bm'; };
  var T = function (en, ms) { return bm() ? ms : en; };
  var say = function (m) { if (typeof toast === 'function') toast(m); };
  var PR = [['fajr', 'Fajr', 'Subuh'], ['dhuhr', 'Dhuhr', 'Zohor'], ['asr', 'Asr', 'Asar'], ['maghrib', 'Maghrib', 'Maghrib'], ['isha', 'Isha', 'Isyak']];
  var DEF = { on: false, p: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true }, am: false, pm: false, lead: 0 };
  function get() { try { var s = JSON.parse(localStorage.getItem(KEY) || '{}'); return { on: !!s.on, p: Object.assign({}, DEF.p, s.p || {}), am: !!s.am, pm: !!s.pm, lead: +s.lead || 0 }; } catch (e) { return JSON.parse(JSON.stringify(DEF)); } }
  function put(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function zone() { try { return JSON.parse(localStorage.getItem('baik.ptz') || '""') || ''; } catch (e) { return ''; } }
  var S = get(), busy = false, note = '';

  var supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  var ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;

  function key64(s) { var p = '='.repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function post(url, body) {
    return fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw new Error(d.error || 'The server did not answer.'); return d; }); });
  }
  function current() { return navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); }); }
  function payload(sub) { return { sub: sub.toJSON(), zone: zone(), lang: bm() ? 'bm' : 'en', prefs: { p: S.p, am: S.am, pm: S.pm, lead: S.lead } }; }

  function enable() {
    busy = true; note = ''; draw();
    Notification.requestPermission().then(function (perm) {
      if (perm !== 'granted') throw new Error(perm === 'denied' ? 'blocked' : T('Reminders need permission to show notifications.', 'Peringatan memerlukan kebenaran untuk memaparkan pemberitahuan.'));
      return Promise.all([navigator.serviceWorker.ready, fetch('/api/push/key').then(function (r) { return r.json(); })]);
    }).then(function (x) {
      var reg = x[0], k = x[1] && x[1].key; if (!k) throw new Error(T('Reminders are not set up on the server yet.', 'Peringatan belum disediakan pada pelayan.'));
      return reg.pushManager.getSubscription().then(function (s) { return s || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key64(k) }); });
    }).then(function (sub) { return post('/api/push/subscribe', payload(sub)); })
      .then(function () { S.on = true; put(S); say(T('Reminders are on for ' + zone() + '.', 'Peringatan aktif untuk ' + zone() + '.')); })
      .catch(function (e) { note = e.message === 'blocked' ? 'blocked' : e.message; })
      .then(function () { busy = false; draw(); });
  }
  function disable() {
    busy = true; draw();
    current().then(function (sub) { if (!sub) return; return post('/api/push/unsubscribe', { endpoint: sub.endpoint }).catch(function () {}).then(function () { return sub.unsubscribe(); }); })
      .catch(function () {}).then(function () { S.on = false; put(S); busy = false; draw(); say(T('Reminders are off.', 'Peringatan dimatikan.')); });
  }
  var syncT = 0;
  function sync() {      // a changed choice, zone or language goes to the server shortly after
    clearTimeout(syncT);
    syncT = setTimeout(function () {
      if (!S.on || !zone()) return;
      current().then(function (sub) { if (!sub) { S.on = false; put(S); draw(); return; } return post('/api/push/subscribe', payload(sub)); })
        .catch(function (e) { note = e.message; draw(); });
    }, 450);
  }
  function test() {
    current().then(function (sub) { if (!sub) throw new Error(T('Turn reminders on first.', 'Hidupkan peringatan dahulu.')); return post('/api/push/test', { endpoint: sub.endpoint }); })
      .then(function () { say(T('A test reminder is on its way.', 'Peringatan ujian sedang dihantar.')); }, function (e) { say(e.message); });
  }

  var BELL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z"/><path d="M10 20a2.2 2.2 0 0 0 4 0"/></svg>';
  function chip(id, label, on) { return '<button type="button" class="qrm-c" data-c="' + id + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + label + '</button>'; }
  function draw() {
    var z = zone(), blocked = supported && Notification.permission === 'denied';
    var h = '<div class="qrm-h"><span class="qrm-ic">' + BELL + '</span><b>' + T('Reminders', 'Peringatan') + '</b>'
      + '<span class="qrm-st' + (S.on ? ' on' : '') + '">' + (S.on ? T('On', 'Aktif') : T('Off', 'Mati')) + '</span></div>';
    var msg = '';
    if (!supported) msg = T('This browser cannot show reminders. Try Chrome, Edge, Firefox or Safari.', 'Pelayar ini tidak dapat memaparkan peringatan. Cuba Chrome, Edge, Firefox atau Safari.');
    else if (ios && !standalone) msg = T('On iPhone and iPad, add Baik to your Home Screen first (Share, then Add to Home Screen), open it from there, then turn reminders on.', 'Pada iPhone dan iPad, tambah Baik ke Skrin Utama dahulu (Kongsi, kemudian Tambah ke Skrin Utama), buka dari situ, kemudian hidupkan peringatan.');
    else if (blocked || note === 'blocked') msg = T('Notifications are blocked for Baik. Allow them in your browser’s site settings, then come back here.', 'Pemberitahuan disekat untuk Baik. Benarkan dalam tetapan laman pelayar anda, kemudian kembali ke sini.');
    else if (!z) msg = T('Choose a JAKIM zone above to get reminders for it.', 'Pilih zon JAKIM di atas untuk mendapat peringatan.');
    if (msg) { box.innerHTML = h + '<p class="qrm-p">' + msg + '</p>'; return; }
    if (!S.on) {
      box.innerHTML = h + '<p class="qrm-p">' + T('A quiet notification at each prayer for ' + z + ', and the morning and evening adhkar if you like. It arrives even when Baik is closed.',
        'Pemberitahuan ringkas setiap waktu solat untuk ' + z + ', serta zikir pagi dan petang jika mahu. Ia sampai walaupun Baik ditutup.') + '</p>'
        + (note ? '<p class="qrm-p qrm-err">' + note + '</p>' : '')
        + '<div class="qrm-row"><button type="button" class="qrm-b pri" id="qrmOn"' + (busy ? ' disabled' : '') + '>' + (busy ? T('Turning on…', 'Menghidupkan…') : T('Turn on reminders', 'Hidupkan peringatan')) + '</button></div>';
      $('qrmOn').onclick = enable;
      return;
    }
    box.innerHTML = h + '<p class="qrm-p">' + T('For zone ' + z + '. Tap to choose what reminds you.', 'Untuk zon ' + z + '. Ketik untuk memilih peringatan.') + '</p>'
      + '<div class="qrm-g" role="group" aria-label="' + T('Prayers', 'Solat') + '">' + PR.map(function (p) { return chip(p[0], bm() ? p[2] : p[1], S.p[p[0]]); }).join('') + '</div>'
      + '<div class="qrm-g" role="group" aria-label="' + T('Adhkar', 'Zikir') + '">' + chip('am', T('Morning adhkar', 'Zikir pagi'), S.am) + chip('pm', T('Evening adhkar', 'Zikir petang'), S.pm) + '</div>'
      + '<div class="qrm-row"><label class="qrm-l"><span>' + T('When', 'Bila') + '</span><select id="qrmLead">'
      + [[0, 'At the time', 'Tepat pada waktunya'], [5, '5 minutes before', '5 minit sebelum'], [10, '10 minutes before', '10 minit sebelum'], [15, '15 minutes before', '15 minit sebelum']]
        .map(function (o) { return '<option value="' + o[0] + '"' + (S.lead === o[0] ? ' selected' : '') + '>' + (bm() ? o[2] : o[1]) + '</option>'; }).join('') + '</select></label>'
      + '<span class="qrm-sp"></span><button type="button" class="qrm-b" id="qrmTest">' + T('Send a test', 'Hantar ujian') + '</button>'
      + '<button type="button" class="qrm-b" id="qrmOff"' + (busy ? ' disabled' : '') + '>' + T('Turn off', 'Matikan') + '</button></div>'
      + (note ? '<p class="qrm-p qrm-err">' + note + '</p>' : '');
    box.querySelectorAll('[data-c]').forEach(function (b) {
      b.onclick = function () {
        var c = b.dataset.c;
        if (c === 'am' || c === 'pm') S[c] = !S[c]; else S.p[c] = !S.p[c];
        b.setAttribute('aria-pressed', (c === 'am' || c === 'pm' ? S[c] : S.p[c]) ? 'true' : 'false');
        put(S); sync();
      };
    });
    $('qrmLead').onchange = function () { S.lead = +this.value; put(S); sync(); };
    $('qrmTest').onclick = test; $('qrmOff').onclick = disable;
  }

  // the zone or language may change elsewhere on the page: keep the card and the server in step
  var seenZone = zone(), seenLang = bm();
  setInterval(function () {
    var z = zone(), l = bm();
    if (z !== seenZone || l !== seenLang) { seenZone = z; seenLang = l; note = ''; draw(); sync(); }
  }, 2500);
  // already on: check this browser still holds the subscription, and refresh the server's copy
  if (S.on && supported) current().then(function (sub) { if (!sub || Notification.permission !== 'granted') { S.on = false; put(S); draw(); } else sync(); }).catch(function () {});
  draw();
})();

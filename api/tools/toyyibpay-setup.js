'use strict';
// One-time: create the ToyyibPay category Baik's bills are filed under, and print its code.
//   node api/tools/toyyibpay-setup.js <userSecretKey> [sandbox|live]
// Put the printed code in TOYYIBPAY_CATEGORY. You can also create a category in the ToyyibPay
// dashboard instead; either way, one category is enough.
const [secret, env = 'sandbox'] = process.argv.slice(2);
if (!secret) { console.log('usage: node api/tools/toyyibpay-setup.js <userSecretKey> [sandbox|live]'); process.exit(1); }
const base = env === 'live' ? 'https://toyyibpay.com' : 'https://dev.toyyibpay.com';
fetch(base + '/index.php/api/createCategory', {
  method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ catname: 'Baik Premium', catdescription: 'Baik Premium plans', userSecretKey: secret }).toString(),
}).then(r => r.text()).then(t => {
  let d; try { d = JSON.parse(t); } catch { console.log('ToyyibPay answered:', t); process.exit(1); }
  const code = Array.isArray(d) && d[0] && d[0].CategoryCode;
  if (!code) { console.log('ToyyibPay did not create it:', t); process.exit(1); }
  console.log('Category created on ' + env + '.\nTOYYIBPAY_CATEGORY=' + code);
}).catch(e => { console.log('Could not reach ToyyibPay:', e.message); process.exit(1); });

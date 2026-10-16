// Prints a fresh VAPID key pair for prayer reminders. Run once:  node api/tools/vapid-keys.js
// Put both in the Static Web App's settings (Azure portal → the app → Environment variables):
//   VAPID_PUBLIC, VAPID_PRIVATE, and also VAPID_SUBJECT (mailto:you@…) and PUSH_TICK_SECRET (any long random text).
// Keep the private key out of chat, email and the repository. Changing the pair later turns every
// subscriber's reminders off until they turn them on again.
const webpush = require('web-push');
const crypto = require('crypto');
const k = webpush.generateVAPIDKeys();
console.log('VAPID_PUBLIC=' + k.publicKey);
console.log('VAPID_PRIVATE=' + k.privateKey);
console.log('PUSH_TICK_SECRET=' + crypto.randomBytes(24).toString('base64url'));

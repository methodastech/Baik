'use strict';
// Outbound email through Azure Communication Services.
//
// Sending is deliberately best-effort at the call site: an account is created
// whether or not the message leaves, because a mail outage must not cost the
// user their registration. What it must never do is report success when the
// address was never written to, so failures are thrown, not swallowed, and the
// caller decides what the person sees.
const { EmailClient } = require('@azure/communication-email');

let client = null;
function mailer() {
  if (client) return client;
  const conn = process.env.COMMUNICATION_CONNECTION_STRING;
  if (!conn) { const e = new Error('Email is not set up on the server (COMMUNICATION_CONNECTION_STRING is missing).'); e.status = 503; throw e; }
  client = new EmailClient(conn);
  return client;
}

const from = () => process.env.MAIL_FROM || 'donotreply@baikapp.com';
const base = () => (process.env.PUBLIC_BASE_URL || 'https://baikapp.com').replace(/\/$/, '');

// Plain text matters: some mail clients show it, and spam filters read it.
function verifyBody(name, link) {
  const hi = name ? 'Assalamualaikum ' + name + ',' : 'Assalamualaikum,';
  return {
    subject: 'Confirm your email · Baik',
    plainText: [
      hi, '',
      'Confirm this address to finish setting up your Baik account:',
      link, '',
      'The link works once, and expires in 24 hours.',
      'If you did not sign up for Baik, you can ignore this message — no account will be opened.',
      '', '— Baik · baikapp.com',
    ].join('\n'),
    html: `<!doctype html><html><body style="margin:0;padding:24px;background:#F3F3F3;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#1E2124">
  <table role="presentation" style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px">
    <tr><td>
      <p style="margin:0 0 20px;font-size:16px;line-height:1.6">${hi}</p>
      <p style="margin:0 0 24px;font-size:16px;line-height:1.6">Confirm this address to finish setting up your Baik account.</p>
      <p style="margin:0 0 28px"><a href="${link}" style="display:inline-block;background:#1E2124;color:#F3F3F3;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600;font-size:16px">Confirm my email</a></p>
      <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#6b6f73">The link works once, and expires in 24 hours.</p>
      <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#6b6f73">If you did not sign up for Baik, ignore this message — no account will be opened.</p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#6b6f73;word-break:break-all">Or paste this into your browser:<br>${link}</p>
    </td></tr>
  </table>
  <p style="max-width:480px;margin:16px auto 0;font-size:12px;color:#6b6f73;text-align:center">Baik · baikapp.com</p>
</body></html>`,
  };
}

function resetBody(name, link) {
  const hi = name ? 'Assalamualaikum ' + name + ',' : 'Assalamualaikum,';
  return {
    subject: 'Reset your password · Baik',
    plainText: [
      hi, '',
      'Someone asked to reset the password on this Baik account. If it was you, set a new one here:',
      link, '',
      'The link works once, and expires in one hour.',
      'If it was not you, ignore this message. Your password has not changed.',
      '', '— Baik · baikapp.com',
    ].join('\n'),
    html: `<!doctype html><html><body style="margin:0;padding:24px;background:#F3F3F3;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#1E2124">
  <table role="presentation" style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px">
    <tr><td>
      <p style="margin:0 0 20px;font-size:16px;line-height:1.6">${hi}</p>
      <p style="margin:0 0 24px;font-size:16px;line-height:1.6">Someone asked to reset the password on this Baik account. If it was you, set a new one.</p>
      <p style="margin:0 0 28px"><a href="${link}" style="display:inline-block;background:#1E2124;color:#F3F3F3;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:600;font-size:16px">Set a new password</a></p>
      <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#6b6f73">The link works once, and expires in one hour.</p>
      <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#6b6f73">If it was not you, ignore this message. Your password has not changed.</p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#6b6f73;word-break:break-all">Or paste this into your browser:<br>${link}</p>
    </td></tr>
  </table>
  <p style="max-width:480px;margin:16px auto 0;font-size:12px;color:#6b6f73;text-align:center">Baik · baikapp.com</p>
</body></html>`,
  };
}

async function send(email, name, body) {
  const poller = await mailer().beginSend({
    senderAddress: from(),
    content: { subject: body.subject, plainText: body.plainText, html: body.html },
    recipients: { to: [{ address: email, displayName: name || email }] },
  });
  return poller.pollUntilDone();
}

async function sendReset(email, name, token) {
  return send(email, name, resetBody(name, base() + '/reset?token=' + encodeURIComponent(token)));
}

async function sendVerification(email, name, token) {
  const link = base() + '/api/auth/verify?token=' + encodeURIComponent(token);
  const body = verifyBody(name, link);
  const poller = await mailer().beginSend({
    senderAddress: from(),
    content: { subject: body.subject, plainText: body.plainText, html: body.html },
    recipients: { to: [{ address: email, displayName: name || email }] },
  });
  return poller.pollUntilDone();
}

module.exports = { sendVerification, sendReset, from, base };

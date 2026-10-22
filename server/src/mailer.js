// Transactional email through Resend (https://resend.com). Optional: without RESEND_API_KEY the
// app still works and people get in-app notifications only.
//   RESEND_API_KEY=re_...   MAIL_FROM="Plowbird <hello@plowbird.app>" (a domain verified in Resend)
const KEY = process.env.RESEND_API_KEY?.trim();
const FROM = process.env.MAIL_FROM?.trim() || 'Plowbird <hello@plowbird.app>';
export const APP_URL = (process.env.APP_URL ?? 'https://plowbird.app').replace(/\/$/, '');
export const emailEnabled = !!KEY;

// Fire-and-forget: a failed email is logged, never thrown at the request that triggered it.
export async function sendEmail({ to, subject, text }) {
  if (!KEY || !to) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [to], subject, text }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return true;
  } catch (e) {
    console.error(`email to ${to} failed:`, e.message);
    return false;
  }
}

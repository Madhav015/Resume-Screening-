// Server-only Razorpay SDK client. Never import this from a client component
// — RAZORPAY_KEY_SECRET must never reach the browser. The key_id (not
// secret) is fine to hand to the browser and is returned by
// /api/billing/subscribe for Checkout to use.

import Razorpay from 'razorpay';

let client: Razorpay | null = null;

export function getRazorpayClient(): Razorpay {
  if (client) return client;

  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set — billing is not configured.');
  }

  client = new Razorpay({ key_id, key_secret });
  return client;
}

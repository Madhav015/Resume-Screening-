// Signature verification for the two places Razorpay authenticates itself
// to us: the Checkout success callback (signed with the account's API key
// secret) and webhook deliveries (signed with a *separate* webhook secret
// you set when configuring the webhook in the Dashboard — these are not the
// same value, don't mix them up).
//
// Implemented with plain Node `crypto` rather than importing a helper from
// the `razorpay` SDK: the algorithm is simple, documented, and stable
// (HMAC-SHA256), and doing it directly avoids depending on an internal
// util's exact import path/signature across SDK versions.
// https://razorpay.com/docs/webhooks/validate-test/

import crypto from 'crypto';

function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// After a subscription Checkout succeeds, the browser gets back
// razorpay_payment_id, razorpay_subscription_id, and razorpay_signature.
// The signature is HMAC-SHA256("<payment_id>|<subscription_id>", key_secret).
export function verifyCheckoutSignature(
  paymentId: string,
  subscriptionId: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${paymentId}|${subscriptionId}`).digest('hex');
  return timingSafeEqualStrings(expected, signature);
}

// Webhook deliveries are signed as HMAC-SHA256(<raw request body>, webhook
// secret) in the `X-Razorpay-Signature` header. Must be computed over the
// exact raw bytes — parsing the body to JSON and re-serializing it before
// hashing will produce a different signature and always fail.
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return timingSafeEqualStrings(expected, signature);
}

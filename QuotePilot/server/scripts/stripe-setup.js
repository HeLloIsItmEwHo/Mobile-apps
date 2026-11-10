// One-time setup: creates the QuotePilot Pro product and its two prices in
// your Stripe account. Safe to run again — existing prices are left alone.
//
//   STRIPE_SECRET_KEY=sk_test_... npm run stripe:setup
//
// To change a price later, create a new price in the Stripe dashboard and
// move the lookup key onto it; the server finds prices by lookup key.

import Stripe from 'stripe';
import { PRICE_LOOKUP_KEYS } from '../src/billing.js';

const PRICES = [
  { plan: 'monthly', unit_amount: 16499, interval: 'month' }, // $164.99
  { plan: 'annual', unit_amount: 164990, interval: 'year' }, // $1,649.90
];

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('Set STRIPE_SECRET_KEY first (Stripe dashboard → Developers → API keys).');
  process.exit(1);
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const existing = await stripe.prices.list({ lookup_keys: Object.values(PRICE_LOOKUP_KEYS), active: true, expand: ['data.product'] });
let productId = existing.data[0]?.product?.id;
if (!productId) {
  const product = await stripe.products.create({ name: 'QuotePilot Pro', description: 'Unlimited quotes, invoices and your own branding.' });
  productId = product.id;
  console.log(`Created product ${productId}`);
}

for (const { plan, unit_amount, interval } of PRICES) {
  const lookupKey = PRICE_LOOKUP_KEYS[plan];
  const found = existing.data.find((price) => price.lookup_key === lookupKey);
  if (found) {
    console.log(`${plan}: already exists (${found.id}, ${(found.unit_amount / 100).toFixed(2)} ${found.currency.toUpperCase()})`);
    continue;
  }
  const price = await stripe.prices.create({ product: productId, currency: 'usd', unit_amount, recurring: { interval }, lookup_key: lookupKey });
  console.log(`${plan}: created ${price.id}`);
}
console.log('Done.');

import { PRICE_LOOKUP_KEYS } from './billing.js';

// What QuotePilot Pro costs. To change a price later, create a new price in
// the Stripe dashboard and transfer the lookup key to it (Stripe prices cannot
// be edited), and update the display prices in the app's billing.js to match.
export const PRO_PRICES = [
  { plan: 'monthly', unit_amount: 16499, interval: 'month' }, // $164.99
  { plan: 'annual', unit_amount: 164990, interval: 'year' }, // $1,649.90
];

// Makes sure the QuotePilot Pro product and its two prices exist in the Stripe
// account. Safe to run repeatedly: prices that already exist are left alone.
// Returns one line per plan describing what happened.
export async function ensureStripePrices(stripe) {
  const existing = await stripe.prices.list({ lookup_keys: Object.values(PRICE_LOOKUP_KEYS), active: true, limit: 10 });
  const missing = PRO_PRICES.filter(({ plan }) => !existing.data.some((price) => price.lookup_key === PRICE_LOOKUP_KEYS[plan]));
  const report = PRO_PRICES.filter((entry) => !missing.includes(entry)).map(({ plan }) => `${plan}: already exists`);
  if (missing.length === 0) return report;

  const productOf = (price) => (price.product && typeof price.product === 'object' ? price.product.id : price.product);
  let productId = existing.data[0] ? productOf(existing.data[0]) : null;
  if (!productId) {
    const product = await stripe.products.create({ name: 'QuotePilot Pro', description: 'Unlimited quotes, invoices and your own branding.' });
    productId = product.id;
  }
  for (const { plan, unit_amount, interval } of missing) {
    const price = await stripe.prices.create({ product: productId, currency: 'usd', unit_amount, recurring: { interval }, lookup_key: PRICE_LOOKUP_KEYS[plan] });
    report.push(`${plan}: created ${price.id}`);
  }
  return report;
}

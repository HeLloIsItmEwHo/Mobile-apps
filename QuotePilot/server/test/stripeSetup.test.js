import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ensureStripePrices } from '../src/stripeSetup.js';

function fakeStripe(prices = []) {
  const created = { products: [], prices: [] };
  return {
    created,
    prices: {
      list: async () => ({ data: prices }),
      create: async (params) => (created.prices.push(params), { id: `price_${created.prices.length}` }),
    },
    products: { create: async (params) => (created.products.push(params), { id: 'prod_new' }) },
  };
}

test('creates the product and both prices in an empty Stripe account', async () => {
  const stripe = fakeStripe();
  const report = await ensureStripePrices(stripe);
  assert.equal(stripe.created.products.length, 1);
  assert.deepEqual(
    stripe.created.prices.map((p) => [p.lookup_key, p.unit_amount, p.recurring.interval, p.currency, p.product]),
    [['quotepilot_pro_monthly', 16499, 'month', 'usd', 'prod_new'], ['quotepilot_pro_annual', 164990, 'year', 'usd', 'prod_new']]
  );
  assert.equal(report.length, 2);
});

test('does nothing when both prices exist, and fills in only what is missing', async () => {
  const both = fakeStripe([{ lookup_key: 'quotepilot_pro_monthly', product: 'prod_1' }, { lookup_key: 'quotepilot_pro_annual', product: 'prod_1' }]);
  await ensureStripePrices(both);
  assert.deepEqual(both.created, { products: [], prices: [] });

  const one = fakeStripe([{ lookup_key: 'quotepilot_pro_monthly', product: { id: 'prod_1' } }]);
  await ensureStripePrices(one);
  assert.equal(one.created.products.length, 0, 'reuses the existing product');
  assert.deepEqual(one.created.prices.map((p) => [p.lookup_key, p.product]), [['quotepilot_pro_annual', 'prod_1']]);
});

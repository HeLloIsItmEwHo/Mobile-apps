// Plans, limits and the purchase entry point.
//
// The paywall, free-tier limit and Pro gating are all real. The one thing that
// is NOT wired is the store transaction itself: `purchase` below unlocks Pro
// locally without charging anyone. Before release, replace the bodies of
// `purchase` and `restore` with RevenueCat (react-native-purchases) or
// expo-iap calls and set BILLING_LIVE to true — nothing else needs to change.

export const BILLING_LIVE = false;

export const FREE_QUOTES_PER_MONTH = 3;

export const PLANS = [
  { id: 'annual', label: 'Annual', price: '$119.99', per: 'year', note: '$10 / month · 2 months free', badge: 'Best value' },
  { id: 'monthly', label: 'Monthly', price: '$14.99', per: 'month', note: 'Cancel anytime' },
];

export const PRO_FEATURES = [
  ['infinite', 'Unlimited quotes', 'No monthly cap — quote every lead.'],
  ['image', 'Your logo & brand color', 'Quotes that look like they came from a big firm.'],
  ['ribbon', 'No TradeQuote footer', 'Remove our branding from every PDF.'],
  ['copy', 'Duplicate past quotes', 'Re-quote repeat jobs in seconds.'],
];

export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function quotesUsedThisMonth(usage) {
  return usage && usage.month === monthKey() ? usage.count : 0;
}

export function freeQuotesLeft(usage) {
  return Math.max(FREE_QUOTES_PER_MONTH - quotesUsedThisMonth(usage), 0);
}

export function canCreateQuote(plan, usage) {
  return Boolean(plan && plan.pro) || freeQuotesLeft(usage) > 0;
}

export function bumpUsage(usage) {
  return { month: monthKey(), count: quotesUsedThisMonth(usage) + 1 };
}

export async function purchase(planId) {
  // TODO(release): Purchases.purchasePackage(...) and verify the entitlement.
  return { pro: true, planId, since: new Date().toISOString(), demo: !BILLING_LIVE };
}

export async function restore() {
  // TODO(release): Purchases.restorePurchases() and map the entitlement.
  return null;
}

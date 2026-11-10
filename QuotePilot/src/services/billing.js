// Plans and free-tier limits as shown in the app.
//
// Whether an account is Pro is decided by the server (from Stripe) and arrives
// as `plan`; nothing here can grant it. Prices are display text: the amounts
// actually charged are the Stripe prices created by `npm run stripe:setup` in
// ../../server — keep the two in step.

export const FREE_QUOTES_PER_MONTH = 3;
export const TRIAL_DAYS = 7;

export const PLANS = [
  { id: 'annual', label: 'Annual', price: '$1,649.90', per: 'year', note: '$137.49 / month · 2 months free', badge: 'Best value' },
  { id: 'monthly', label: 'Monthly', price: '$164.99', per: 'month', note: 'Cancel anytime' },
];

export const PRO_FEATURES = [
  ['infinite', 'Unlimited quotes', 'No monthly cap — quote every lead.'],
  ['receipt', 'One-tap invoices', 'Turn an accepted quote into an invoice and track who has paid.'],
  ['image', 'Your logo & brand color', 'Documents that look like they came from a big firm, with no QuotePilot footer.'],
  ['copy', 'Duplicate past quotes', 'Re-quote repeat jobs in seconds.'],
];

// Months are counted in UTC to match the server.
export function monthKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
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

// The server's count is authoritative, but quotes made offline may not have
// reached it yet, so within the same month the larger number is kept.
export function mergeUsage(local, server) {
  if (!server) return local;
  if (local && local.month === server.month) return { month: server.month, count: Math.max(local.count, server.count) };
  return server.month === monthKey() || !local || local.month !== monthKey() ? server : local;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDate = (iso) => {
  const date = new Date(iso);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

// One sentence describing where the subscription stands.
export function describePlan(plan) {
  if (!plan || !plan.pro) return plan && plan.status === 'canceled' ? 'Your Pro subscription has ended.' : null;
  const until = plan.periodEnd ? shortDate(plan.periodEnd) : null;
  const name = plan.plan === 'annual' ? 'Annual plan' : plan.plan === 'monthly' ? 'Monthly plan' : 'Pro plan';
  if (plan.cancelAtPeriodEnd) return `${name} — cancelled, Pro stays on until ${until || 'the end of the period'}.`;
  if (plan.status === 'trialing') return `${name} — free trial${until ? ` until ${until}, then billed` : ''}.`;
  if (plan.status === 'past_due') return `${name} — the last payment failed. Update your card to keep Pro.`;
  return `${name}${until ? ` — renews ${until}` : ''}.`;
}

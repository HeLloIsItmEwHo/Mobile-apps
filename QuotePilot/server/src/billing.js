// Subscription state lives on the user row and is written only from Stripe
// (webhooks), never from the app. The app just reads `plan`.

export const PRICE_LOOKUP_KEYS = { monthly: 'quotepilot_pro_monthly', annual: 'quotepilot_pro_annual' };

const PRO_STATUSES = new Set(['trialing', 'active', 'past_due']); // past_due: Stripe is still retrying the card
const DEAD_STATUSES = new Set(['canceled', 'incomplete_expired']);

export function planOf(user) {
  return {
    pro: PRO_STATUSES.has(user.sub_status),
    status: user.sub_status || 'none',
    plan: user.sub_plan || null,
    periodEnd: user.sub_period_end ? new Date(user.sub_period_end).toISOString() : null,
    cancelAtPeriodEnd: Boolean(user.sub_cancel_at_end),
    trialAvailable: !user.trial_used,
  };
}

const idOf = (value) => (value && typeof value === 'object' ? value.id : value) || null;

// Copies a Stripe subscription onto its user. Returns false when no user
// matches (e.g. a subscription created by hand in the Stripe dashboard).
export async function applySubscription(db, subscription) {
  const customerId = idOf(subscription.customer);
  const { rows } = await db.query(
    'SELECT id, stripe_subscription_id FROM users WHERE stripe_customer_id = $1 OR id::text = $2 LIMIT 1',
    [customerId, subscription.metadata?.userId || '']
  );
  const user = rows[0];
  if (!user) return false;

  // An old, cancelled subscription must not overwrite the one in use.
  const isCurrent = !user.stripe_subscription_id || user.stripe_subscription_id === subscription.id;
  if (!isCurrent && DEAD_STATUSES.has(subscription.status)) return true;

  const item = subscription.items?.data?.[0];
  // Newer Stripe API versions report the period on the item, older ones on the subscription.
  const periodEnd = item?.current_period_end ?? subscription.current_period_end ?? null;
  const interval = item?.price?.recurring?.interval;
  const plan =
    Object.keys(PRICE_LOOKUP_KEYS).find((key) => PRICE_LOOKUP_KEYS[key] === item?.price?.lookup_key) ||
    (interval === 'year' ? 'annual' : interval === 'month' ? 'monthly' : null);

  await db.query(
    `UPDATE users SET stripe_customer_id = COALESCE(stripe_customer_id, $2), stripe_subscription_id = $3, sub_status = $4,
            sub_plan = $5, sub_period_end = to_timestamp($6), sub_cancel_at_end = $7, trial_used = true
      WHERE id = $1`,
    [user.id, customerId, subscription.id, subscription.status, plan, periodEnd, Boolean(subscription.cancel_at_period_end)]
  );
  return true;
}

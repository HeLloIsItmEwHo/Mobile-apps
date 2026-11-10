-- Idempotent: runs on every server start.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                  text NOT NULL UNIQUE,          -- stored lower-cased
  password_hash          text NOT NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  -- Billing state, written only by Stripe webhooks.
  stripe_customer_id     text UNIQUE,
  stripe_subscription_id text,
  sub_status             text,
  sub_plan               text,
  sub_period_end         timestamptz,
  sub_cancel_at_end      boolean NOT NULL DEFAULT false,
  trial_used             boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,                          -- sha256 of the bearer token
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS password_resets (
  token_hash text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz
);

-- Synced documents: one 'profile' row and many 'quote' rows per user.
-- `rev` increases every time a row changes, so a device can ask for
-- "everything since rev N". Deleted rows stay as tombstones.
CREATE SEQUENCE IF NOT EXISTS docs_rev;
CREATE TABLE IF NOT EXISTS docs (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       text NOT NULL,
  id         text NOT NULL,
  data       jsonb NOT NULL DEFAULT '{}'::jsonb,
  deleted    boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL,                      -- when the device made the change
  created_at timestamptz NOT NULL DEFAULT now(),
  rev        bigint NOT NULL,
  PRIMARY KEY (user_id, kind, id)
);
CREATE INDEX IF NOT EXISTS docs_user_rev ON docs(user_id, rev);

-- Log of Stripe webhook events that were processed.
CREATE TABLE IF NOT EXISTS stripe_events (
  id          text PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now()
);

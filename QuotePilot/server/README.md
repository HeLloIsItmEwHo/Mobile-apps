# QuotePilot server

The backend for the QuotePilot app: accounts, cloud sync and subscription billing.

- **Node.js + Express**, one process, no build step
- **PostgreSQL** for everything it stores
- **Stripe** for subscriptions (Checkout, Customer Portal, webhooks)
- **Resend** for password-reset emails (optional in development)

## Run it locally

You need Node 20+ and a PostgreSQL database.

```bash
cd QuotePilot/server
npm install
cp .env.example .env        # then set DATABASE_URL
npm run dev                 # http://localhost:8787  (tables are created on start)
```

Without Stripe keys the server runs fine; billing endpoints answer 503. Without a Resend key, password-reset emails are printed to the server log.

Point the app at it by creating `QuotePilot/.env`:

```
EXPO_PUBLIC_API_URL=http://localhost:8787
```

On a real phone use your computer's network address instead of `localhost`.

### Tests

```bash
createdb quotepilot_test
TEST_DATABASE_URL=postgres://user:password@localhost:5432/quotepilot_test npm test
```

The tests use a real database and the real Stripe SDK for webhook signatures; Stripe's network calls are stubbed. **They have not been run against a live Stripe account** — do the test-mode walkthrough below before taking money.

## Going live

### 1. Database
Create a managed PostgreSQL database (Neon, Supabase, Render, Railway…) and copy its connection string into `DATABASE_URL`. Turn on the provider's automatic backups — this database is your customers' quotes and invoices.

### 2. Deploy the server
Any host that runs a Docker container or Node works (Render, Fly.io, Railway…). A `Dockerfile` is included. Set the environment variables from `.env.example`:

| Variable | What it is |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `PUBLIC_URL` | The server's public `https://` address |
| `APP_URL` | (optional) address of the web app, linked from the post-checkout page |
| `TRUST_PROXY` | `1` on hosts that put a proxy in front of your app (most do) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | from steps 3–4 |
| `RESEND_API_KEY`, `MAIL_FROM` | from step 5 |

Check it with `https://your-server/health` → `{"ok":true,"billing":true}`.

### 3. Stripe products and prices
In the [Stripe dashboard](https://dashboard.stripe.com), copy your secret key (start in **test mode**), then:

```bash
STRIPE_SECRET_KEY=sk_test_... npm run stripe:setup
```

Or, with nothing to install: set `STRIPE_AUTO_SETUP=1` on the server and it does the same thing each time it starts (look for `[stripe setup]` in the log).

This creates the "QuotePilot Pro" product with two prices: **$164.99/month** and **$1,649.90/year**. The server finds them by lookup key (`quotepilot_pro_monthly`, `quotepilot_pro_annual`), so there are no price IDs to configure. To change a price later, create a new price in the dashboard and transfer the lookup key to it — and update the display prices in `QuotePilot/src/services/billing.js` to match.

### 4. Stripe webhook
Dashboard → Developers → Webhooks → add endpoint `https://your-server/billing/webhook` with these events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Copy the endpoint's signing secret into `STRIPE_WEBHOOK_SECRET`. **Without this, people can pay but Pro never switches on.**

Also enable the Customer Portal (Settings → Billing → Customer portal) so "Manage subscription" in the app works.

### 5. Email
Create a [Resend](https://resend.com) account, verify your sending domain, and set `RESEND_API_KEY` and `MAIL_FROM`. Without it nobody can reset a forgotten password.

### 6. Test-mode walkthrough
With test keys: sign up in the app → Upgrade → pay with card `4242 4242 4242 4242` → return to the app and confirm Pro is on → Settings → Manage subscription → cancel → confirm the app shows it ending. Then switch to live keys and repeat steps 3–4 in live mode (live mode has its own products, webhook and secrets).

## How it works

### Accounts
Email + password. Passwords are hashed with scrypt; sessions are random bearer tokens stored only as SHA-256 hashes, valid for 180 days. Sign-in and reset endpoints are rate limited per IP. Resetting a password signs out every device. Deleting an account cancels its Stripe subscription first, then removes all of its data.

### Sync
The app is offline-first: it works from its own copy and calls `POST /sync` with what it changed plus the last revision it has seen; the server replies with everything changed elsewhere since. Each profile and quote is one document. If two devices edit the same document, **the most recent edit wins** (whole document, not field by field).

### Billing
The app never decides who is Pro. `POST /billing/checkout` returns a Stripe Checkout link; Stripe then tells the server about the subscription through the webhook, and the server stores its status on the user. The app reads that as `plan` from `/me` and `/sync`. The 7-day trial is offered once per account.

The free tier's monthly quote count is tracked by the server and shown in the app. It is enforced by the app, not rejected by the server, so a modified client could exceed it.

### Endpoints

| | |
|---|---|
| `POST /auth/signup`, `/auth/login`, `/auth/logout` | accounts and sessions |
| `POST /auth/forgot`, `/auth/reset`, `GET /reset-password` | password reset (email link → hosted form) |
| `GET /me`, `DELETE /me` | account, plan and usage; delete account |
| `POST /sync` | upload and download changes |
| `POST /billing/checkout`, `/billing/portal` | Stripe Checkout and Customer Portal links |
| `POST /billing/webhook` | Stripe → server |
| `GET /health` | uptime check |

## App stores and Stripe

Stripe checkout opens in the browser. That is fine for the web app. For the iPhone and Android apps, Apple and Google have their own rules about selling digital subscriptions outside their in-app purchase systems, the rules differ by country, and they have been changing — check the current App Store Review Guidelines (section 3.1) and Google Play payments policy before submitting. If you need in-app purchase, the store's purchase notifications (for example through RevenueCat webhooks) can set the same subscription fields on the user that the Stripe webhook sets today; nothing else in the app would change.

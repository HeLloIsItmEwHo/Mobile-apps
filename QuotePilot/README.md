# QuotePilot

Professional quotes for trades and contractors — plumbers, HVAC techs, electricians, roofers, painters, landscapers, handymen and more. Describe the job in a sentence, get a priced, branded quote, and send it as a PDF.

Built with Expo (SDK 58) / React Native — runs on iOS, Android and web — with a Node + PostgreSQL backend in [`server/`](server/README.md) for accounts, cloud sync and Stripe billing.

## How it works

0. **Account** — sign up with email and password. Quotes are backed up and follow the owner to any device they sign in on; the app keeps working offline and syncs when it's back online.
1. **Setup (5 short screens)** — the owner tells the app what they do:
   trade → services offered → pricing (hourly rate, call-out fee, materials markup, tax) → business details (licence, insurance, years trading) → quote preferences (tone, deposit, validity, invoice terms, payment terms, warranty, branding).
2. **New quote** — pick a recent customer or enter a new one, describe the job ("replace 2 toilets and fix a leak, after hours") or tap services. The generator matches the description to the owner's services, picks up quantities and urgency, and prices labor and materials with *their* rates and markup.
3. **Edit** — every line, the scope, wording and terms are editable. Any line can be offered as an **optional upgrade** (listed on the quote, kept out of the total). An owner-only panel shows what the materials cost and what's left after them.
4. **Send** — a clean PDF through the share sheet (email, text, WhatsApp…). Track each quote as Draft / Sent / Accepted / Declined.
5. **Follow up** — quotes with no reply after 3 days are flagged, with a ready-written follow-up message.
6. **Invoice** — turn an accepted quote into an invoice, credit the deposit, and mark it paid. The home screen shows value awaiting reply, won, unpaid invoices and win rate, with search and filters.

## Business model

| | Free | Pro — $164.99/mo or $1,649.90/yr |
|---|---|---|
| Quotes | 3 per month | Unlimited |
| Invoices | — | ✓ |
| Logo & brand color on documents | — | ✓ |
| "Created with QuotePilot" footer | shown | removed |
| Duplicate past quotes | — | ✓ |

Limits, prices and feature list live in `src/services/billing.js`.

Subscriptions are sold through Stripe Checkout and recorded by the server; the app only reads whether the account is Pro. Display prices live in `src/services/billing.js`; the amounts charged are the Stripe prices created by `npm run stripe:setup` in `server/`. See [`server/README.md`](server/README.md) for going live and for the note on app-store payment rules.

## Getting started

The app needs the server running (see [`server/README.md`](server/README.md)).

```bash
# 1. backend
cd QuotePilot/server
npm install
cp .env.example .env      # set DATABASE_URL
npm run dev               # http://localhost:8787

# 2. app (in another terminal)
cd QuotePilot
npm install
cp .env.example .env      # EXPO_PUBLIC_API_URL — the server's address
npx expo start            # scan the QR code with Expo Go, or press i / a / w
```

Tests: `npm test` here (sync engine) and `npm test` in `server/` (API, needs PostgreSQL).

## Project structure

```
QuotePilot/
├── App.js                         # State, sign-in, sync wiring, route stack
├── server/                        # Backend: accounts, sync, Stripe billing (own README)
├── tests/                         # Unit tests for the sync engine
└── src/
    ├── data/trades.js             # Trade catalog: services, hours, materials, warranties, exclusions
    ├── screens/
    │   ├── AuthScreen.js          # Sign up, sign in, forgot password
    │   ├── SetupScreen.js         # Onboarding wizard (also used to edit the profile)
    │   ├── HomeScreen.js          # Quote list, stats, free-plan banner
    │   ├── QuoteEditorScreen.js   # Describe job → generate → edit lines and wording
    │   ├── QuotePreviewScreen.js  # Quote / invoice preview, status, follow-up, send PDF
    │   ├── PaywallScreen.js
    │   └── SettingsScreen.js
    ├── services/
    │   ├── quoteGenerator.js      # Job description + profile → priced draft
    │   ├── quoteHtml.js           # Quote → HTML (preview and PDF share one template)
    │   ├── exportQuote(.web).js   # PDF + share sheet (native) / print dialog (web)
    │   ├── api.js                 # Client for the backend
    │   ├── sync.js                # Offline-first sync: pending changes and merging
    │   ├── tokenStore(.web).js    # Sign-in token in the keychain (localStorage on web)
    │   ├── billing.js             # Plans and free-tier limit as shown in the app
    │   └── storage.js             # The device's working copy (AsyncStorage)
    ├── components/                # Buttons, fields, chips, HTML preview
    └── utils/                     # Money maths, cross-platform dialogs
```

## Notes

- **Quote generation is rule-based and on-device** (instant, free, offline). The job templates in `src/data/trades.js` — hours and material costs — are starting estimates to be edited per job, not a price book; tune them for your market. `generateDraft(profile, input)` is the single seam if you later want an LLM behind it (call it from a server, never ship an API key in the app).
- **Sync is last-edit-wins per quote.** If two devices edit the same quote before syncing, the later edit replaces the earlier one.
- Trades with no built-in templates ("Other trade") work from the custom services the owner adds in setup.

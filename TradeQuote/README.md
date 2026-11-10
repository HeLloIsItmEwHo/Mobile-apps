# TradeQuote

Professional quotes for trades and contractors — plumbers, HVAC techs, electricians, roofers, painters, landscapers, handymen and more. Describe the job in a sentence, get a priced, branded quote, and send it as a PDF.

Built with Expo (SDK 58) / React Native. Runs on iOS, Android and web.

## How it works

1. **Setup (5 short screens)** — the owner tells the app what they do:
   trade → services offered → pricing (hourly rate, call-out fee, materials markup, tax) → business details (licence, insurance, years trading) → quote preferences (tone, deposit, validity, payment terms, warranty, branding).
2. **New quote** — enter the customer, describe the job ("replace 2 toilets and fix a leak, after hours") or tap services. The generator matches the description to the owner's services, picks up quantities and urgency, and prices labor and materials with *their* rates and markup.
3. **Edit** — every line, the scope, wording and terms are editable.
4. **Send** — a clean PDF through the share sheet (email, text, WhatsApp…). Track each quote as Draft / Sent / Accepted / Declined; the home screen shows pending value, won value and win rate.

## Business model

| | Free | Pro — $14.99/mo or $119.99/yr |
|---|---|---|
| Quotes | 3 per month | Unlimited |
| Logo & brand color on quotes | — | ✓ |
| "Created with TradeQuote" footer | shown | removed |
| Duplicate past quotes | — | ✓ |

Limits, prices and feature list live in `src/services/billing.js`.

> **Before release:** the paywall and all gating work, but the store transaction is a stub — `purchase()` unlocks Pro locally without charging. Replace `purchase`/`restore` in `src/services/billing.js` with RevenueCat (`react-native-purchases`) or `expo-iap` and set `BILLING_LIVE = true`.

## Getting started

```bash
cd TradeQuote
npm install
npx expo start        # scan the QR code with Expo Go, or press i / a / w
```

## Project structure

```
TradeQuote/
├── App.js                         # State, persistence, route stack
└── src/
    ├── data/trades.js             # Trade catalog: services, hours, materials, warranties, exclusions
    ├── screens/
    │   ├── SetupScreen.js         # Onboarding wizard (also used to edit the profile)
    │   ├── HomeScreen.js          # Quote list, stats, free-plan banner
    │   ├── QuoteEditorScreen.js   # Describe job → generate → edit lines and wording
    │   ├── QuotePreviewScreen.js  # Document preview, status, send PDF
    │   ├── PaywallScreen.js
    │   └── SettingsScreen.js
    ├── services/
    │   ├── quoteGenerator.js      # Job description + profile → priced draft
    │   ├── quoteHtml.js           # Quote → HTML (preview and PDF share one template)
    │   ├── exportQuote(.web).js   # PDF + share sheet (native) / print dialog (web)
    │   ├── billing.js             # Plans, free-tier limit, purchase stub
    │   └── storage.js             # AsyncStorage persistence
    ├── components/                # Buttons, fields, chips, HTML preview
    └── utils/                     # Money maths, cross-platform dialogs
```

## Notes

- **Quote generation is rule-based and on-device** (instant, free, offline). The job templates in `src/data/trades.js` — hours and material costs — are starting estimates to be edited per job, not a price book; tune them for your market. `generateDraft(profile, input)` is the single seam if you later want an LLM behind it (call it from a server, never ship an API key in the app).
- **Data is stored on the device only** — no accounts or cloud sync yet.
- Trades with no built-in templates ("Other trade") work from the custom services the owner adds in setup.

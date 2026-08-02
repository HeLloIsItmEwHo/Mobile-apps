# Flipic ⚡

**Snap a pic, find the profit.**

Flipic is a fast, playful, AI-powered thrift & resale price evaluator built with Expo. Point your camera at a thrift-store item, get a mock AI resale estimate with a gamified deal score, run it through the Cha-Ching profit calculator, and save your best finds to "My Flips".

## Stack

- Expo (SDK 51) / React Native
- `expo-camera` — live viewfinder + snapshot capture
- `react-native-reanimated` — pulsing reticle & scan-line animations
- `lucide-react-native` — icon set
- `@react-native-async-storage/async-storage` — local "My Flips" persistence
- `@react-native-community/slider` — marketplace fee % control

## Getting started

```bash
cd Flipic
npm install
npx expo start
```

Scan the QR code with Expo Go (iOS/Android), or press `i` / `a` for a simulator/emulator. Camera features require a physical device or a simulator with camera support.

## Project structure

```
Flipic/
├── App.js                       # Top-level state + navigation (scan / results / my flips)
├── src/
│   ├── screens/
│   │   ├── CameraScreen.js      # Screen A — live viewfinder & scan
│   │   ├── ResultsScreen.js     # Screen B — deal score, market value, profit calculator, comps
│   │   └── MyFlipsScreen.js     # Screen C — saved flips vault
│   ├── components/              # Reusable UI: badges, cards, tab bar, overlays, etc.
│   ├── services/
│   │   ├── aiEvaluatorService.js  # Mock AI evaluator (swap-in point for a real vision API)
│   │   └── storageService.js      # AsyncStorage wrapper for saved flips
│   ├── utils/
│   │   └── profitCalculator.js  # Net profit / ROI math
│   └── theme/
│       └── colors.js            # Dark mode + neon accent palette
```

## Swapping in a real AI backend

`src/services/aiEvaluatorService.js` exports a single `analyzeImage({ uri, base64 })` function that currently resolves mock data after a simulated delay. To go live:

1. Replace the body of `analyzeImage` with a call to Google Cloud Vision, OpenAI GPT-4o Vision, or your own pricing backend.
2. Keep the return shape identical (`title`, `category`, `confidence`, `dealScore`, `valueRange`, `avgSoldPrice`, `suggestedBuyPrice`, `soldComps`, `photoUri`) — every screen consumes this contract, so no UI changes are required.

## Design

Dark charcoal background (`#0F172A`) with electric lime/emerald accents for profit (`#22C55E` / `#10B981`) and magenta/amber highlights for high deal scores — playful, gamified, utility-first.

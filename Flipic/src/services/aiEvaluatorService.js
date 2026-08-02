// aiEvaluatorService.js
//
// Mock AI resale-value evaluator. Swap `analyzeImage` for a real call later,
// e.g. Google Cloud Vision (label/object detection) piped into a pricing
// lookup, or a single OpenAI GPT-4o Vision call that returns structured JSON
// matching the shape below. Keep the return contract identical and every
// screen in the app keeps working unchanged.

const SIMULATED_DELAY_MS = 1500;

const MOCK_ITEMS = [
  {
    title: 'Vintage 90s Nike Windbreaker',
    category: 'Vintage Outerwear',
    confidence: 0.98,
    dealScore: 9.8,
    valueRange: { low: 85, high: 110 },
    avgSoldPrice: 95,
    suggestedBuyPrice: 8,
    soldComps: [
      { platform: 'eBay', price: 102, condition: 'Good', daysAgo: 2 },
      { platform: 'Poshmark', price: 89, condition: 'Very Good', daysAgo: 5 },
      { platform: 'Mercari', price: 95, condition: 'Good', daysAgo: 1 },
      { platform: 'eBay', price: 110, condition: 'Excellent', daysAgo: 9 },
    ],
  },
  {
    title: 'Game Boy Color (Teal)',
    category: 'Retro Electronics',
    confidence: 0.95,
    dealScore: 8.6,
    valueRange: { low: 55, high: 80 },
    avgSoldPrice: 68,
    suggestedBuyPrice: 12,
    soldComps: [
      { platform: 'eBay', price: 72, condition: 'Tested, Working', daysAgo: 3 },
      { platform: 'Mercari', price: 60, condition: 'Good', daysAgo: 4 },
      { platform: 'eBay', price: 79, condition: 'Excellent', daysAgo: 6 },
      { platform: 'Poshmark', price: 65, condition: 'Good', daysAgo: 12 },
    ],
  },
  {
    title: 'Retro Polaroid SX-70 Camera',
    category: 'Vintage Photography',
    confidence: 0.91,
    dealScore: 7.2,
    valueRange: { low: 40, high: 65 },
    avgSoldPrice: 52,
    suggestedBuyPrice: 10,
    soldComps: [
      { platform: 'eBay', price: 58, condition: 'Untested', daysAgo: 4 },
      { platform: 'eBay', price: 45, condition: 'Good', daysAgo: 7 },
      { platform: 'Mercari', price: 52, condition: 'Good', daysAgo: 2 },
    ],
  },
  {
    title: "Vintage Levi's 501 Jeans",
    category: 'Vintage Denim',
    confidence: 0.97,
    dealScore: 9.1,
    valueRange: { low: 65, high: 120 },
    avgSoldPrice: 88,
    suggestedBuyPrice: 6,
    soldComps: [
      { platform: 'eBay', price: 95, condition: 'Excellent', daysAgo: 1 },
      { platform: 'Poshmark', price: 78, condition: 'Good', daysAgo: 3 },
      { platform: 'eBay', price: 110, condition: 'Like New', daysAgo: 8 },
      { platform: 'Mercari', price: 72, condition: 'Good', daysAgo: 10 },
    ],
  },
];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// imagePayload: { uri, base64? } — the snapshot captured by expo-camera.
export async function analyzeImage(imagePayload) {
  // Real integration would look roughly like:
  //   const response = await fetch(VISION_API_ENDPOINT, {
  //     method: 'POST',
  //     headers: { Authorization: `Bearer ${API_KEY}` },
  //     body: JSON.stringify({ image: imagePayload.base64 }),
  //   });
  //   const data = await response.json();
  //   return normalizeToFlipicItem(data);
  await wait(SIMULATED_DELAY_MS);

  const item = MOCK_ITEMS[Math.floor(Math.random() * MOCK_ITEMS.length)];

  return {
    id: `scan_${Date.now()}`,
    scannedAt: new Date().toISOString(),
    photoUri: imagePayload?.uri ?? null,
    ...item,
  };
}

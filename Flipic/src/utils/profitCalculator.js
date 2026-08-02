function round2(value) {
  return Math.round(value * 100) / 100;
}

// Net Profit = Sold Price - Buy Price - Shipping - Marketplace Fees
// ROI is measured against what the flipper actually put in (buy price + shipping).
export function calculateProfit({ soldPrice, buyPrice, shipping, feePercent }) {
  const fees = soldPrice * (feePercent / 100);
  const netProfit = soldPrice - buyPrice - shipping - fees;
  const invested = buyPrice + shipping;
  const roi = invested > 0 ? (netProfit / invested) * 100 : 0;

  return {
    fees: round2(fees),
    netProfit: round2(netProfit),
    roi,
  };
}

// Parses user-typed numbers ("1,200.50", "", "12.") without ever returning NaN.
export function num(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = parseFloat(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatMoney(value, currency = '$') {
  const n = round2(num(value));
  const [whole, cents] = Math.abs(n).toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${n < 0 ? '-' : ''}${currency}${grouped}.${cents}`;
}

export function lineTotal(item) {
  return round2(num(item.qty) * num(item.unitPrice));
}

export function computeTotals(quote) {
  const items = quote.items || [];
  const byType = { labor: 0, material: 0, fee: 0 };
  items.forEach((item) => {
    byType[item.type] = round2((byType[item.type] || 0) + lineTotal(item));
  });
  const subtotal = round2(items.reduce((sum, item) => sum + lineTotal(item), 0));
  const discount = round2(subtotal * (Math.min(Math.max(num(quote.discountPct), 0), 100) / 100));
  const taxable = round2(subtotal - discount);
  const tax = round2(taxable * (Math.max(num(quote.taxRate), 0) / 100));
  const total = round2(taxable + tax);
  const deposit = round2(total * (Math.min(Math.max(num(quote.depositPct), 0), 100) / 100));
  return { byType, subtotal, discount, taxable, tax, total, deposit };
}

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
  // Optional add-ons are offered on the quote but stay out of the total.
  const items = (quote.items || []).filter((item) => !item.optional);
  const optionalTotal = round2((quote.items || []).filter((item) => item.optional).reduce((sum, item) => sum + lineTotal(item), 0));
  const byType = { labor: 0, material: 0, fee: 0 };
  items.forEach((item) => {
    byType[item.type] = round2((byType[item.type] || 0) + lineTotal(item));
  });
  // What the materials cost the owner. With no cost entered we assume no
  // markup rather than overstate the profit.
  const materialsCost = round2(
    items
      .filter((item) => item.type === 'material')
      .reduce((sum, item) => sum + num(item.qty) * (String(item.cost ?? '').trim() === '' ? num(item.unitPrice) : num(item.cost)), 0)
  );
  const subtotal = round2(items.reduce((sum, item) => sum + lineTotal(item), 0));
  const discount = round2(subtotal * (Math.min(Math.max(num(quote.discountPct), 0), 100) / 100));
  const taxable = round2(subtotal - discount);
  const tax = round2(taxable * (Math.max(num(quote.taxRate), 0) / 100));
  const total = round2(taxable + tax);
  const deposit = round2(total * (Math.min(Math.max(num(quote.depositPct), 0), 100) / 100));
  const profit = round2(taxable - materialsCost);
  const margin = taxable > 0 ? Math.round((profit / taxable) * 100) : 0;
  return { byType, subtotal, discount, taxable, tax, total, deposit, optionalTotal, materialsCost, profit, margin };
}

// Amount still owed on an invoice: the total, less the deposit if it was collected.
export function invoiceDue(quote) {
  const totals = computeTotals(quote);
  if (!quote.invoice) return 0;
  if (quote.invoice.paidAt) return 0;
  return round2(totals.total - (quote.invoice.depositPaid ? totals.deposit : 0));
}

const DAY_MS = 24 * 60 * 60 * 1000;
export const FOLLOW_UP_AFTER_DAYS = 3;

// A sent quote that has sat unanswered for a few days.
export function needsFollowUp(quote, now = Date.now()) {
  return quote.status === 'sent' && Boolean(quote.sentAt) && now - new Date(quote.sentAt).getTime() >= FOLLOW_UP_AFTER_DAYS * DAY_MS;
}

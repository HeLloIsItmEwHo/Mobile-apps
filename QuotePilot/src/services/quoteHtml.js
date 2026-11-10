// Renders a quote as a self-contained HTML document. The same markup feeds the
// in-app preview and the exported PDF, so what the owner sees is what is sent.

import { tradeLabel } from '../data/trades';
import { computeTotals, formatMoney, lineTotal, num, round2 } from '../utils/money';

const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const multiline = (value) => esc(value).replace(/\n/g, '<br/>');

export function formatDate(iso) {
  const date = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function validUntil(quote) {
  const date = new Date(quote.createdAt);
  date.setDate(date.getDate() + Math.max(Math.round(num(quote.validDays)), 0));
  return date.toISOString();
}

export function invoiceDueDate(quote) {
  const date = new Date(quote.invoice.issuedAt);
  date.setDate(date.getDate() + Math.max(Math.round(num(quote.invoice.dueDays)), 0));
  return date.toISOString();
}

function bulletList(text) {
  const lines = String(text || '').split('\n').map((line) => line.replace(/^\s*[•\-*]\s*/, '').trim()).filter(Boolean);
  if (!lines.length) return '';
  return `<ul>${lines.map((line) => `<li>${esc(line)}</li>`).join('')}</ul>`;
}

const GROUPS = [
  ['labor', 'Labor'],
  ['material', 'Materials'],
  ['fee', 'Other charges'],
];

// mode 'quote' renders the proposal; mode 'invoice' renders the bill for the
// same job once it has been accepted (needs quote.invoice).
export function buildQuoteHtml(profile, quote, { pro = false, mode = 'quote' } = {}) {
  const isInvoice = mode === 'invoice' && Boolean(quote.invoice);
  const invoice = quote.invoice || {};
  const cur = profile.currency || '$';
  const money = (value) => formatMoney(value, cur);
  const totals = computeTotals(quote);
  // Logo and brand color are Pro features; free quotes use the default navy.
  const brand = pro && profile.brandColor ? profile.brandColor : '#12355B';
  const logo = pro && profile.logo ? `<img class="logo" src="${esc(profile.logo)}" alt=""/>` : '';
  const visible = (item) => item.description || num(item.unitPrice);
  const included = (quote.items || []).filter((item) => !item.optional && visible(item));
  const optional = (quote.items || []).filter((item) => item.optional && visible(item));

  const rows = GROUPS.map(([type, label]) => {
    const items = included.filter((item) => item.type === type);
    if (!items.length) return '';
    return (
      `<tr class="group"><td colspan="4">${label}</td></tr>` +
      items
        .map(
          (item) => `<tr>
            <td>${esc(item.description || label)}</td>
            <td class="r">${esc(String(num(item.qty)))}${item.unit ? ` ${esc(item.unit)}` : ''}</td>
            <td class="r">${money(item.unitPrice)}</td>
            <td class="r">${money(lineTotal(item))}</td>
          </tr>`
        )
        .join('')
    );
  }).join('');

  const optionalBlock =
    !isInvoice && optional.length
      ? `<div class="optional">
          <h3>Optional upgrades</h3>
          <div class="muted small" style="margin-bottom:6px">Not included in the total above. Tell us which you’d like and we’ll add them.</div>
          <table>${optional
            .map((item) => `<tr><td>☐ &nbsp;${esc(item.description || 'Upgrade')}${num(item.qty) !== 1 ? ` <span class="muted">(${esc(String(num(item.qty)))} ${esc(item.unit || '')})</span>` : ''}</td><td class="r"><strong>+ ${money(lineTotal(item))}</strong></td></tr>`)
            .join('')}</table>
        </div>`
      : '';

  const contact = [profile.phone, profile.email].filter(Boolean).map(esc).join(' &nbsp;·&nbsp; ');
  const credentials = [
    profile.license ? `License #${esc(profile.license)}` : '',
    profile.insured ? 'Fully insured' : '',
  ].filter(Boolean).join(' &nbsp;·&nbsp; ');
  const customer = quote.customer || {};

  const depositCredit = isInvoice && invoice.depositPaid ? totals.deposit : 0;
  const amountDue = round2(totals.total - depositCredit);

  const termsBits = [];
  if (isInvoice) {
    termsBits.push(invoice.paidAt ? `Paid in full on ${formatDate(invoice.paidAt)}. Thank you!` : `Payment of ${money(amountDue)} is due by ${formatDate(invoiceDueDate(quote))}.`);
    termsBits.push(`This invoice relates to quote ${esc(quote.number)}.`);
  } else {
    if (totals.deposit > 0) termsBits.push(`A deposit of ${money(totals.deposit)} (${num(quote.depositPct)}%) is required to schedule the work.`);
    if (quote.paymentTerms) termsBits.push(esc(quote.paymentTerms));
    termsBits.push(`This quote is valid until ${formatDate(validUntil(quote))}.`);
  }

  const section = (title, body) => (body ? `<div class="section"><h3>${title}</h3>${body}</div>` : '');
  const docNumber = isInvoice ? invoice.number : quote.number;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${isInvoice ? 'Invoice' : 'Quote'} ${esc(docNumber)}</title>
<style>
  @page { margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1B2533; font-size: 12.5px; line-height: 1.5; margin: 0; padding: 22px; background: #fff; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 3px solid ${brand}; padding-bottom: 16px; }
  .biz { display: flex; gap: 12px; align-items: center; min-width: 0; }
  .logo { width: 62px; height: 62px; object-fit: contain; border-radius: 6px; }
  .biz h1 { margin: 0; font-size: 20px; color: ${brand}; line-height: 1.2; }
  .muted { color: #5B6878; }
  .small { font-size: 11px; }
  .doc { text-align: right; white-space: nowrap; }
  .doc .word { font-size: 24px; font-weight: 800; letter-spacing: 3px; color: ${brand}; line-height: 1; }
  .meta { display: flex; justify-content: space-between; gap: 16px; margin: 18px 0 6px; }
  .label { font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #8A95A3; margin-bottom: 2px; }
  .job { font-size: 16px; font-weight: 700; margin: 14px 0 6px; }
  .intro { margin: 0 0 4px; }
  .section { margin-top: 16px; page-break-inside: avoid; }
  h3 { font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: ${brand}; margin: 0 0 6px; }
  ul { margin: 0; padding-left: 18px; }
  li { margin-bottom: 3px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th { text-align: left; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #fff; background: ${brand}; padding: 7px 8px; }
  td { padding: 7px 8px; border-bottom: 1px solid #E3E8EE; vertical-align: top; }
  .r { text-align: right; white-space: nowrap; }
  tr.group td { background: #F4F6F8; font-weight: 700; font-size: 11px; color: #5B6878; padding: 5px 8px; }
  .totals { margin-left: auto; width: 270px; margin-top: 10px; page-break-inside: avoid; }
  .totals div { display: flex; justify-content: space-between; padding: 4px 8px; }
  .totals .grand { background: ${brand}; color: #fff; font-size: 16px; font-weight: 800; padding: 9px 8px; border-radius: 4px; margin-top: 4px; }
  .totals .dep { font-weight: 700; }
  .sign { display: flex; gap: 28px; margin-top: 30px; page-break-inside: avoid; }
  .sign div { flex: 1; border-top: 1px solid #1B2533; padding-top: 4px; font-size: 11px; color: #5B6878; }
  .foot { margin-top: 26px; padding-top: 10px; border-top: 1px solid #E3E8EE; text-align: center; font-size: 10.5px; color: #8A95A3; }
  .optional { margin-top: 18px; border: 1px dashed #B9C3CF; border-radius: 6px; padding: 12px; page-break-inside: avoid; }
  .optional td { border-bottom: 0; padding: 4px 0; }
  .paid { display: inline-block; margin-top: 6px; border: 2px solid #1E9E6A; color: #1E9E6A; font-weight: 800; letter-spacing: 2px; padding: 2px 10px; border-radius: 4px; font-size: 13px; }

</style>
</head>
<body>
  <div class="top">
    <div class="biz">
      ${logo}
      <div>
        <h1>${esc(profile.businessName || 'Your Business')}</h1>
        <div class="muted">${esc(tradeLabel(profile))}</div>
        ${profile.address ? `<div class="muted small">${multiline(profile.address)}</div>` : ''}
        ${contact ? `<div class="muted small">${contact}</div>` : ''}
        ${credentials ? `<div class="muted small">${credentials}</div>` : ''}
      </div>
    </div>
    <div class="doc">
      <div class="word">${isInvoice ? 'INVOICE' : 'QUOTE'}</div>
      <div class="muted">${esc(docNumber)}</div>
      ${isInvoice && invoice.paidAt ? '<div class="paid">PAID</div>' : ''}
    </div>
  </div>

  <div class="meta">
    <div>
      <div class="label">${isInvoice ? 'Bill to' : 'Prepared for'}</div>
      <div><strong>${esc(customer.name || 'Customer')}</strong></div>
      ${customer.address ? `<div class="muted">${multiline(customer.address)}</div>` : ''}
      ${customer.phone ? `<div class="muted">${esc(customer.phone)}</div>` : ''}
      ${customer.email ? `<div class="muted">${esc(customer.email)}</div>` : ''}
    </div>
    <div style="text-align:right">
      <div class="label">${isInvoice ? 'Invoice date' : 'Date'}</div>
      <div>${formatDate(isInvoice ? invoice.issuedAt : quote.createdAt)}</div>
      <div class="label" style="margin-top:6px">${isInvoice ? 'Due' : 'Valid until'}</div>
      <div>${formatDate(isInvoice ? invoiceDueDate(quote) : validUntil(quote))}</div>
    </div>
  </div>

  ${quote.title ? `<div class="job">${esc(quote.title)}</div>` : ''}
  ${!isInvoice && quote.intro ? `<p class="intro">${multiline(quote.intro)}</p>` : ''}

  ${section(isInvoice ? 'Work completed' : 'Scope of work', bulletList(quote.scope))}

  <div class="section" style="page-break-inside:auto">
    <h3>${isInvoice ? 'Charges' : 'Pricing'}</h3>
    <table>
      <thead><tr><th>Description</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4" class="muted">No line items yet.</td></tr>'}</tbody>
    </table>
    <div class="totals">
      <div><span>Subtotal</span><span>${money(totals.subtotal)}</span></div>
      ${totals.discount > 0 ? `<div><span>Discount (${num(quote.discountPct)}%)</span><span>-${money(totals.discount)}</span></div>` : ''}
      ${totals.tax > 0 ? `<div><span>${esc(profile.taxLabel || 'Tax')} (${num(quote.taxRate)}%)</span><span>${money(totals.tax)}</span></div>` : ''}
      ${isInvoice && depositCredit > 0 ? `<div><span>Total</span><span>${money(totals.total)}</span></div><div><span>Deposit received</span><span>-${money(depositCredit)}</span></div>` : ''}
      <div class="grand"><span>${isInvoice ? (invoice.paidAt ? 'Paid' : 'Amount due') : 'Total'}</span><span>${money(isInvoice ? amountDue : totals.total)}</span></div>
      ${!isInvoice && totals.deposit > 0 ? `<div class="dep"><span>Deposit to book</span><span>${money(totals.deposit)}</span></div>` : ''}
    </div>
  </div>

  ${optionalBlock}
  ${section('Notes', quote.notes ? `<div>${multiline(quote.notes)}</div>` : '')}
  ${section(isInvoice ? 'Payment' : 'Payment & terms', `<div>${termsBits.join(' ')}</div>`)}
  ${section('Warranty', quote.warranty ? `<div>${multiline(quote.warranty)}</div>` : '')}
  ${isInvoice ? '' : section('Not included', bulletList(quote.exclusions))}

  ${isInvoice ? '' : `<div class="section">
    <h3>Acceptance</h3>
    <div>By signing below, the customer accepts this quote and authorizes ${esc(profile.businessName || 'the contractor')} to proceed with the work described.</div>
    <div class="sign"><div>Customer signature</div><div>Printed name</div><div>Date</div></div>
  </div>`}

  <div class="foot">
    ${esc(profile.businessName || '')}${contact ? ` &nbsp;·&nbsp; ${contact}` : ''}
    ${pro ? '' : '<div style="margin-top:4px">Created with QuotePilot</div>'}
  </div>
</body>
</html>`;
}

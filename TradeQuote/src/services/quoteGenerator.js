// Turns a plain-language job description into a priced draft quote, using what
// the owner told us in setup: their trade, the services they offer, their
// labor rate, materials markup, call-out fee, terms and tone.
//
// It is rule-based and runs on-device (instant, free, works offline). The
// contract is `generateDraft(profile, input) -> { title, intro, scope, items }`;
// an LLM-backed generator can replace it behind the same signature.

import { getOfferedServices, getTrade, tradeLabel } from '../data/trades';
import { num, round2 } from '../utils/money';

const NUMBER_WORDS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, couple: 2 };

let idCounter = 0;
export function newId(prefix = 'id') {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}-${Math.random().toString(36).slice(2, 6)}`;
}

export function makeItem(type, description = '', qty = 1, unitPrice = 0, unit = type === 'labor' ? 'hr' : 'ea') {
  return { id: newId('item'), type, description, qty: String(qty), unit, unitPrice: String(unitPrice) };
}

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// "replace 2 toilets" / "three new outlets" -> how many of this service.
function quantityNear(text, keyword) {
  const pattern = new RegExp(`\\b(\\d{1,2}|${Object.keys(NUMBER_WORDS).join('|')})\\s+(?:[a-z-]+\\s+){0,2}?${escapeRegex(keyword)}`);
  const match = text.match(pattern);
  if (!match) return 1;
  const value = NUMBER_WORDS[match[1]] || parseInt(match[1], 10);
  return Math.min(Math.max(value || 1, 1), 50);
}

export function matchServices(profile, description, pickedIds = []) {
  const text = ` ${String(description || '').toLowerCase()} `;
  const scored = getOfferedServices(profile).map((service) => {
    let score = 0;
    let count = 1;
    service.kw.forEach((keyword) => {
      if (new RegExp(`\\b${escapeRegex(keyword)}`).test(text)) {
        score += keyword.length; // longer keyword = more specific match
        count = Math.max(count, quantityNear(text, keyword));
      }
    });
    return { service, score, count, picked: pickedIds.includes(service.id) };
  });

  const best = Math.max(0, ...scored.map((entry) => entry.score));
  return scored
    .filter((entry) => entry.picked || (entry.score > 0 && entry.score >= best * 0.4))
    .sort((a, b) => Number(b.picked) - Number(a.picked) || b.score - a.score)
    .slice(0, 5);
}

function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || '';
}

export function buildIntro(profile, customerName) {
  const business = profile.businessName || 'We';
  const first = firstName(customerName);
  const noun = profile.trade === 'other' ? tradeLabel(profile).toLowerCase() : getTrade(profile.trade).noun;

  const credentials = [];
  if (profile.license) credentials.push('licensed');
  if (profile.insured) credentials.push('fully insured');
  const years = Math.round(num(profile.years));
  const clients = profile.clientType === 'both' ? 'residential and commercial' : profile.clientType || 'residential';
  let about = `${business} is a ${credentials.length ? `${credentials.join(' and ')} ` : ''}${noun} business`;
  about += years >= 2 ? ` with ${years} years of experience serving ${clients} customers.` : ` serving ${clients} customers.`;

  if (profile.tone === 'formal') {
    return `Dear ${customerName || 'Customer'},\n\n${business} is pleased to submit the following quotation for your consideration. ${about} The scope of work and pricing are set out below.`;
  }
  if (profile.tone === 'direct') {
    return `Thank you for the opportunity to quote this work. ${about} The scope and pricing are below.`;
  }
  return `Hi${first ? ` ${first}` : ''}, thanks for reaching out! Here's exactly what we'd do and what it will cost — no surprises. ${about}`;
}

export function generateDraft(profile, { description = '', pickedIds = [], emergency = false, customerName = '' }) {
  const rate = num(profile.hourlyRate);
  const markup = 1 + num(profile.markupPct) / 100;
  const matches = matchServices(profile, description, pickedIds);
  const items = [];
  const scopeLines = [];

  matches.forEach(({ service, count }) => {
    const suffix = count > 1 ? ` (×${count})` : '';
    items.push(makeItem('labor', `${service.name}${suffix} — labor`, round2(service.hours * count), rate));
    service.mats.forEach((material) => {
      items.push(makeItem('material', material.description, count, round2(material.cost * markup)));
    });
    scopeLines.push(`• ${service.name}${suffix}: ${service.scope}`);
  });

  const summary = String(description).trim().replace(/\s+/g, ' ');
  if (matches.length === 0) {
    // Nothing recognised — give an honest skeleton for the owner to fill in
    // rather than inventing work.
    items.push(makeItem('labor', 'Labor', 2, rate));
    items.push(makeItem('material', 'Materials', 1, 0));
    if (summary) scopeLines.push(`• ${summary.charAt(0).toUpperCase()}${summary.slice(1)}${/[.!?]$/.test(summary) ? '' : '.'}`);
  }
  scopeLines.push('• Protect the work area, clean up on completion and remove all job-related debris.');

  const laborTotal = items.filter((item) => item.type === 'labor').reduce((sum, item) => sum + num(item.qty) * num(item.unitPrice), 0);
  if (emergency && profile.emergency && num(profile.emergencyPct) > 0) {
    items.push(makeItem('fee', `Emergency / after-hours service (+${num(profile.emergencyPct)}% labor)`, 1, round2(laborTotal * (num(profile.emergencyPct) / 100))));
  }
  if (num(profile.tripFee) > 0) {
    items.push(makeItem('fee', 'Service call & travel', 1, num(profile.tripFee)));
  }

  const title = matches.length
    ? matches.slice(0, 2).map((entry) => entry.service.name).join(' + ') + (matches.length > 2 ? ' & more' : '')
    : summary.split(' ').slice(0, 7).join(' ') || `${tradeLabel(profile)} work`;

  return {
    title,
    intro: buildIntro(profile, customerName),
    scope: scopeLines.join('\n'),
    items,
    matched: matches.length,
  };
}

export function blankQuote(profile) {
  const trade = getTrade(profile.trade);
  const now = new Date().toISOString();
  return {
    id: newId('quote'),
    number: `Q-${profile.nextNumber || 1001}`,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    customer: { name: '', address: '', phone: '', email: '' },
    description: '',
    title: '',
    intro: '',
    scope: '',
    items: [],
    discountPct: '0',
    taxRate: String(profile.taxRate || '0'),
    depositPct: String(profile.depositPct || '0'),
    validDays: String(profile.validDays || '30'),
    paymentTerms: profile.paymentTerms || '',
    warranty: profile.warranty || trade.warranty,
    exclusions: trade.exclusions.join('\n'),
    notes: '',
  };
}

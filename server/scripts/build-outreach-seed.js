// Turns the outreach CSVs in marketing/outreach/ into server/seed-data/outreach.json, which the
// API loads into the admin Outreach tracker on boot (outreach.js). Rows are keyed by list + name,
// so re-running after adding CSV rows only adds the new ones; edits made in /admin are kept.
//
//   node scripts/build-outreach-seed.js
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(here, '../../marketing/outreach');

// RFC 4180-ish: quoted fields, doubled quotes, commas and newlines inside quotes, a BOM.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') (field += '"'), i++;
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') row.push(field), (field = '');
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field), rows.push(row), (row = []), (field = '');
    } else field += c;
  }
  if (field || row.length) row.push(field), rows.push(row);
  const [head, ...body] = rows.filter((r) => r.some((x) => x.trim()));
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

const read = (file) => (existsSync(resolve(SRC, file)) ? parseCsv(readFileSync(resolve(SRC, file), 'utf8')) : []);
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v != null && v !== ''));
const join = (...xs) => xs.filter(Boolean).join(' · ') || null;

const rows = [];
const add = (list, source, r) => r.name && rows.push(clean({ list, source, ...r }));

for (const r of read('west-metro/driver-leads.csv'))
  add('driver', 'west-metro/driver-leads.csv', {
    name: r.name, category: r.type, city: r.city, area: r.service_area, phone: r.phone, email: r.email, website: r.website_or_post_url,
    notes: join(r.advertises_residential_plowing && `Advertises residential plowing: ${r.advertises_residential_plowing}`, r.notes),
    details: clean({ source_url: r.source_url }),
  });
for (const r of read('driver-leads.csv'))
  add('driver', 'driver-leads.csv', {
    name: r.business, category: 'landscaper', city: r.based_in, area: r.pilot_areas_served_per_site, phone: r.phone, email: r.email, website: r.website,
    notes: r.advertises_residential_plowing && `Advertises residential plowing: ${r.advertises_residential_plowing}`,
    details: clean({ source_url: r.source_url }),
  });
for (const r of read('hoas.csv'))
  add('partner', 'hoas.csv', {
    name: r.name, category: r.type || 'hoa', area: join(r.address_or_area, r.pilot_cities_served), phone: r.phone, email: r.email, website: r.website,
    notes: r.notes, details: clean({ source_url: r.source_url }),
  });
for (const r of read('neighborhood-orgs.csv'))
  add('partner', 'neighborhood-orgs.csv', {
    name: r.name, category: 'neighborhood_org', city: r.city, area: r.pilot_suburb, website: r.website, contact: r.public_contact,
    notes: join(r.newsletter && `Newsletter: ${r.newsletter}`, r.sponsorship_or_ads && `Sponsorship/ads: ${r.sponsorship_or_ads}`),
    details: clean({ contact_form: r.contact_form_url, source_url: r.source_url }),
  });
for (const r of read('west-metro/flyer-spots.csv'))
  add(['hoa', 'neighborhood_assoc', 'chamber'].includes(r.category) ? 'partner' : 'flyer', 'west-metro/flyer-spots.csv', {
    name: r.name, category: r.category, city: r.city, address: r.address, contact: r.contact,
    notes: join(r.how_to_post, r.notes),
    details: clean({ when: r.date_or_hours, best_timing: r.best_timing, source_url: r.source_url }),
  });
for (const r of read('west-metro/commercial-prospects.csv'))
  add('commercial', 'west-metro/commercial-prospects.csv', {
    name: r.name, category: r.category, city: r.city, address: r.address, phone: r.phone, email: r.email, website: r.website, contact: r.decision_maker_hint,
    notes: r.notes, details: clean({ lot_size: r.est_lot_size, source_url: r.source_url }),
  });

writeFileSync(resolve(here, '../seed-data/outreach.json'), JSON.stringify(rows, null, 1) + '\n');
const counts = rows.reduce((m, r) => ((m[r.list] = (m[r.list] ?? 0) + 1), m), {});
console.log(`wrote ${rows.length} rows`, counts);

// Server rendered pages: a booking by its reference, and the admin desk.
import { renderPage, escapeHtml as h } from './render.mjs';
import { load, SLOTS } from './store.mjs';
import { publicBooking } from './api.mjs';

const when = (b) => `${new Date(b.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}, ${b.slot}`;
const stamp = (iso) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const STATUS = { requested: 'Requested, we call to confirm', confirmed: 'Confirmed', visited: 'Visited', cancelled: 'Cancelled' };

export async function bookingPage(b, { fresh = false, message = '' } = {}) {
  const p = publicBooking(b);
  const body = `
<section class="prose wrap" aria-labelledby="b-title">
  <div class="inner">
    <h1 id="b-title">${fresh ? 'Your visit is pencilled in' : 'Your site visit'}</h1>
    <p class="updated">Reference <strong>${h(p.ref)}</strong> · ${h(STATUS[p.status] || p.status)}</p>
    ${message ? `<p class="error-text" style="font-size: inherit">${h(message)}</p>` : ''}
    ${fresh ? '<p>We call within a working day to confirm the time. Keep the reference; it finds the booking again from any page.</p>' : ''}
    <h2>${h(p.project)}</h2>
    <p>${h(when(p))}${p.config ? `, looking at a ${h(p.config)}` : ''}</p>
    <p>${h(p.name)} · ${h(p.phoneMasked)}${p.email ? ` · ${h(p.email)}` : ''}</p>
    ${p.notes ? `<p class="muted">“${h(p.notes)}”</p>` : ''}
    ${p.status !== 'cancelled' ? `
    <h2>Change of plan</h2>
    <p>To cancel, confirm the last four digits of the mobile number on the booking. To move the time, cancel and book again, or call <a href="tel:+912067670000">+91 20 6767 0000</a>.</p>
    <form method="post" action="/booking/${h(p.ref)}/cancel" class="cancel-form" data-cancel>
      <label class="label" for="last4">Last four digits</label>
      <input class="field" id="last4" name="last4" inputmode="numeric" pattern="\\d{4}" maxlength="4" required style="max-width: 10rem">
      <button class="button" type="submit" style="margin-top: 1rem">Cancel this visit</button>
    </form>` : '<p>This visit is cancelled. <a class="link-plain" href="/book-a-visit.html">Book another</a> whenever you like.</p>'}
    <p style="margin-top: 3rem"><a class="link-plain" href="/location.html">How to reach the gate</a> · <a class="link-plain" href="/faq.html">Before you come up</a></p>
  </div>
</section>`;
  return renderPage({ title: `Visit ${p.ref} · Aranya Estates`, description: 'Your site visit booking.', nav: 'book', path: '/booking/x', bodyClass: 'booking-page' }, body);
}

export async function lookupPage(message = '') {
  const body = `
<section class="prose wrap" aria-labelledby="l-title">
  <div class="inner">
    <h1 id="l-title">Find your visit</h1>
    <p>Enter the reference from the confirmation, such as AR-0012.</p>
    ${message ? `<p class="error-text" style="font-size: inherit">${h(message)}</p>` : ''}
    <form method="get" action="/booking/" style="margin-top: 1.5rem">
      <label class="label" for="ref">Reference</label>
      <input class="field" id="ref" name="ref" required pattern="[Aa][Rr]-?\\d{1,6}" style="max-width: 14rem" placeholder="AR-0012">
      <button class="button" type="submit" style="margin-top: 1rem">Find it</button>
    </form>
  </div>
</section>`;
  return renderPage({ title: 'Find your visit · Aranya Estates', description: 'Look up a site visit booking by its reference.', nav: 'book', path: '/booking/', bodyClass: 'booking-page' }, body);
}

export async function adminPage({ notice = '' } = {}) {
  const db = await load();
  const bookings = [...db.bookings].sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot));
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter((b) => b.date >= today && b.status !== 'cancelled');
  const rows = bookings.map((b) => `
<tr class="st-${h(b.status)}">
  <td><a class="link-plain" href="/booking/${h(b.ref)}">${h(b.ref)}</a></td>
  <td>${h(b.date)}<br><span class="muted">${h(b.slot)}</span></td>
  <td>${h(b.project)}${b.config ? `<br><span class="muted">${h(b.config)}</span>` : ''}</td>
  <td>${h(b.name)}<br><a href="tel:+91${h(b.phone)}">${h(b.phone)}</a>${b.email ? `<br><a href="mailto:${h(b.email)}">${h(b.email)}</a>` : ''}</td>
  <td>${b.notes ? h(b.notes) : '<span class="muted">·</span>'}</td>
  <td>${h(STATUS[b.status] || b.status)}<br><span class="muted">${stamp(b.created)}</span></td>
  <td>
    <form method="post" action="/admin/bookings/${h(b.ref)}/status" class="status-form">
      <select name="status" class="field" aria-label="Status for ${h(b.ref)}">
        ${['requested', 'confirmed', 'visited', 'cancelled'].map((s) => `<option value="${s}"${s === b.status ? ' selected' : ''}>${s}</option>`).join('')}
      </select>
      <button class="button" type="submit">Save</button>
    </form>
  </td>
</tr>`).join('');
  const enquiries = [...db.enquiries].reverse().map((e) => `
<tr class="st-${h(e.status)}">
  <td>${h(e.ref)}<br><span class="muted">${stamp(e.created)}</span></td>
  <td>${h(e.topic)}<br><span class="muted">${h(e.page)}</span></td>
  <td>${h(e.name)}<br>${h(e.contact)}</td>
  <td>${h(e.message)}</td>
  <td>
    <form method="post" action="/admin/enquiries/${h(e.ref)}/status" class="status-form">
      <input type="hidden" name="status" value="${e.status === 'open' ? 'answered' : 'open'}">
      <button class="button${e.status === 'open' ? '' : ' ghost'}" type="submit">${e.status === 'open' ? 'Mark answered' : 'Reopen'}</button>
    </form>
  </td>
</tr>`).join('');
  const perSlot = SLOTS.map((s) => `<span>${s}: ${upcoming.filter((b) => b.slot === s).length}</span>`).join(' · ');
  const body = `
<section class="prose wrap admin" aria-labelledby="a-title">
  <div class="inner" style="max-width: none; margin-left: 0">
    <h1 id="a-title">The lounge desk</h1>
    <p class="updated">${upcoming.length} upcoming visit${upcoming.length === 1 ? '' : 's'} · ${db.enquiries.filter((e) => e.status === 'open').length} open question${db.enquiries.filter((e) => e.status === 'open').length === 1 ? '' : 's'} · upcoming by slot: ${perSlot}</p>
    ${notice ? `<p class="hint" style="color: var(--accent)">${h(notice)}</p>` : ''}
    <h2>Site visits</h2>
    <p><a class="link-plain" href="/admin/bookings.csv">Download as CSV</a></p>
    <div class="table-wrap"><table class="admin-table" data-ui>
      <thead><tr><th>Ref</th><th>When</th><th>Project</th><th>Who</th><th>Notes</th><th>Status</th><th>Change</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="7" class="muted">No visits booked yet. The form on the site writes here.</td></tr>'}</tbody>
    </table></div>
    <h2>Questions</h2>
    <div class="table-wrap"><table class="admin-table" data-ui>
      <thead><tr><th>Ref</th><th>Topic</th><th>Who</th><th>Question</th><th></th></tr></thead>
      <tbody>${enquiries || '<tr><td colspan="5" class="muted">No questions yet.</td></tr>'}</tbody>
    </table></div>
  </div>
</section>`;
  return renderPage({ title: 'Lounge desk · Aranya Estates', description: 'Bookings and enquiries.', nav: 'admin', path: '/admin/', bodyClass: 'admin-page', head: '<meta name="robots" content="noindex, nofollow">' }, body);
}

export async function bookingsCsv() {
  const db = await load();
  const cols = ['ref', 'status', 'date', 'slot', 'project', 'config', 'name', 'phone', 'email', 'notes', 'created'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [cols.join(','), ...db.bookings.map((b) => cols.map((c) => esc(b[c])).join(','))].join('\r\n');
}

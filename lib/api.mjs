// Bookings and enquiries: validation, the JSON API and the form fallback.
import { load, mutate, nextRef, slotsLeft, SLOTS, PROJECTS } from './store.mjs';

const CONFIGS = ['', '2 BHK', '3 BHK', '3 BHK with study', '4 BHK', 'Penthouse', 'Villa'];
const DAY = 86400000;

const clean = (v, max = 200) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const isoToday = () => new Date().toISOString().slice(0, 10);

export function validateBooking(input) {
  const b = {
    name: clean(input.name, 80), phone: clean(input.phone, 20).replace(/[\s-]/g, ''), email: clean(input.email, 120).toLowerCase(),
    date: clean(input.date, 10), slot: clean(input.slot, 5), project: clean(input.project, 40), config: clean(input.config, 30), notes: clean(input.notes, 600),
  };
  const errors = {};
  if (b.name.length < 2) errors.name = 'Enter your name.';
  if (!/^(\+91)?[6-9]\d{9}$/.test(b.phone)) errors.phone = 'Enter a 10 digit Indian mobile number.';
  if (b.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) errors.email = 'That email address does not look right.';
  const today = isoToday();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date) || Number.isNaN(Date.parse(b.date))) errors.date = 'Pick a date.';
  else if (b.date < today) errors.date = 'Pick a date from today onwards.';
  else if (Date.parse(b.date) - Date.parse(today) > 90 * DAY) errors.date = 'We book up to ninety days ahead.';
  if (!SLOTS.includes(b.slot)) errors.slot = 'Pick a time.';
  if (!PROJECTS.includes(b.project)) errors.project = 'Pick a project.';
  if (!CONFIGS.includes(b.config)) b.config = '';
  b.phone = b.phone.replace(/^\+91/, '');
  return { booking: b, errors };
}

export async function createBooking(input) {
  const { booking, errors } = validateBooking(input);
  if (Object.keys(errors).length) return { status: 400, body: { ok: false, errors } };
  await load();
  return mutate((db) => {
    const left = slotsLeft(booking.date)[booking.slot];
    if (left <= 0) return { status: 409, body: { ok: false, errors: { slot: 'That slot is full. Pick another time.' }, left: slotsLeft(booking.date) } };
    const record = { ref: nextRef('booking'), ...booking, status: 'requested', created: new Date().toISOString(), history: [] };
    db.bookings.push(record);
    console.log(`[booking] ${record.ref} ${record.project} ${record.date} ${record.slot} ${record.name}`);
    return { status: 201, body: { ok: true, booking: publicBooking(record) } };
  });
}

export function publicBooking(b) {
  const { history, phone, email, ...rest } = b; // the reference alone opens a booking, so the number and address stay on the server
  return { ...rest, phoneMasked: b.phone.replace(/^(\d{2})\d{4}(\d{4})$/, '$1····$2') };
}

export async function getBooking(ref) {
  const db = await load();
  return db.bookings.find((b) => b.ref === ref.toUpperCase()) || null;
}

export async function cancelBooking(ref, phoneLast4) {
  const b = await getBooking(ref);
  if (!b) return { status: 404, body: { ok: false, error: 'No booking with that reference.' } };
  if (!/^\d{4}$/.test(phoneLast4 || '') || !b.phone.endsWith(phoneLast4)) return { status: 403, body: { ok: false, error: 'The last four digits do not match the mobile number on the booking.' } };
  if (b.status === 'cancelled') return { status: 200, body: { ok: true, booking: publicBooking(b) } };
  return mutate((db) => {
    const rec = db.bookings.find((x) => x.ref === b.ref);
    rec.history.push({ at: new Date().toISOString(), from: rec.status, to: 'cancelled', by: 'visitor' });
    rec.status = 'cancelled';
    return { status: 200, body: { ok: true, booking: publicBooking(rec) } };
  });
}

export async function setBookingStatus(ref, status, by = 'admin') {
  if (!['requested', 'confirmed', 'visited', 'cancelled'].includes(status)) return { status: 400, body: { ok: false, error: 'Unknown status.' } };
  await load();
  return mutate((db) => {
    const rec = db.bookings.find((x) => x.ref === ref.toUpperCase());
    if (!rec) return { status: 404, body: { ok: false, error: 'No booking with that reference.' } };
    rec.history.push({ at: new Date().toISOString(), from: rec.status, to: status, by });
    rec.status = status;
    return { status: 200, body: { ok: true, booking: publicBooking(rec) } };
  });
}

export async function availability(date) {
  await load();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return { status: 400, body: { ok: false, error: 'date=YYYY-MM-DD' } };
  const day = new Date(date + 'T00:00:00').getDay();
  const open = day === 0 ? SLOTS.filter((s) => s >= '11:00' && s < '17:00') : SLOTS;
  const left = slotsLeft(date);
  return { status: 200, body: { ok: true, date, slots: SLOTS.map((s) => ({ slot: s, left: open.includes(s) ? left[s] : 0, open: open.includes(s) })) } };
}

export async function createEnquiry(input) {
  const e = { name: clean(input.name, 80), contact: clean(input.contact, 120), topic: clean(input.topic, 40) || 'question', message: clean(input.message, 1500), page: clean(input.page, 120) };
  const errors = {};
  if (e.name.length < 2) errors.name = 'Enter your name.';
  const c = e.contact.replace(/[\s-]/g, '');
  if (!(/^(\+91)?[6-9]\d{9}$/.test(c) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c))) errors.contact = 'Enter a mobile number or an email address.';
  if (e.message.length < 5) errors.message = 'Write the question.';
  if (Object.keys(errors).length) return { status: 400, body: { ok: false, errors } };
  await load();
  return mutate((db) => {
    const record = { ref: nextRef('enquiry'), ...e, status: 'open', created: new Date().toISOString() };
    db.enquiries.push(record);
    console.log(`[enquiry] ${record.ref} ${record.topic} from ${record.name}`);
    return { status: 201, body: { ok: true, enquiry: record } };
  });
}

export async function setEnquiryStatus(ref, status) {
  if (!['open', 'answered'].includes(status)) return { status: 400, body: { ok: false, error: 'Unknown status.' } };
  await load();
  return mutate((db) => {
    const rec = db.enquiries.find((x) => x.ref === ref.toUpperCase());
    if (!rec) return { status: 404, body: { ok: false, error: 'No enquiry with that reference.' } };
    rec.status = status;
    return { status: 200, body: { ok: true, enquiry: rec } };
  });
}

// Ratan Galaxy sample site — page behaviour shared by every page: menu, reveals, the word-by-word statement,
// the EMI reader, the FAQ accordion and the booking form. No dependencies. Content never depends on it.
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ----- menu panel -----
  const toggle = document.querySelector('.menu-toggle');
  const panel = document.getElementById('menu');
  if (toggle && panel) {
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      panel.hidden = !open;
      document.body.classList.toggle('menu-open', open);
      if (open) panel.querySelector('a')?.focus({ preventScroll: true });
    };
    toggle.addEventListener('click', () => setOpen(panel.hidden));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { setOpen(false); toggle.focus(); } });
    window.matchMedia('(min-width: 60em)').addEventListener('change', (e) => { if (e.matches && !panel.hidden) setOpen(false); });
  }

  // ----- reveal once on entry -----
  const targets = document.querySelectorAll('[data-reveal]');
  if (targets.length) {
    if (!('IntersectionObserver' in window) || reduced.matches) targets.forEach((el) => el.classList.add('is-in'));
    else {
      const io = new IntersectionObserver((entries) => {
        for (const entry of entries) { if (!entry.isIntersecting) continue; entry.target.classList.add('is-in'); io.unobserve(entry.target); }
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
      targets.forEach((el) => io.observe(el));
      // Two safety nets: anything on screen 2.5 s after load, and anything the page has scrolled past (a very fast
      // scroll, or a capture that resizes the viewport, can outrun the observer).
      const sweep = () => targets.forEach((el) => { if (el.classList.contains('is-in')) return; const r = el.getBoundingClientRect(); if (r.top < innerHeight * 0.95) { el.classList.add('is-in'); io.unobserve(el); } });
      window.addEventListener('load', () => setTimeout(sweep, 2500));
      let sweepQueued = false;
      window.addEventListener('scroll', () => { if (sweepQueued) return; sweepQueued = true; requestAnimationFrame(() => { sweepQueued = false; sweep(); }); }, { passive: true });
    }
  }

  // ----- the statement: each word brightens as it crosses a line 62% down the screen -----
  document.querySelectorAll('.statement p').forEach((p) => {
    const words = p.textContent.trim().split(/\s+/);
    p.textContent = '';
    words.forEach((w, i) => { const s = document.createElement('span'); s.className = 'w'; s.textContent = w; p.append(s); if (i < words.length - 1) p.append(' '); });
    const spans = [...p.querySelectorAll('.w')];
    if (reduced.matches) { spans.forEach((s) => s.classList.add('is-on')); return; }
    let ticking = false;
    const update = () => {
      ticking = false;
      const line = innerHeight * 0.62;
      spans.forEach((s) => { if (s.getBoundingClientRect().top < line) s.classList.add('is-on'); });
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    update();
  });

  // ----- EMI reader -----
  const emi = document.querySelector('.emi');
  if (emi) {
    const price = emi.querySelector('#emi-home');
    const down = emi.querySelector('#emi-down');
    const years = emi.querySelector('#emi-years');
    const rate = emi.querySelector('#emi-rate');
    const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
    const crore = (n) => (n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` : `₹${(n / 1e5).toFixed(1)} L`);
    const put = (sel, text) => { const el = emi.querySelector(sel); if (el) el.textContent = text; };
    const compute = () => {
      const P0 = Number(price.value);
      const dp = Number(down.value) / 100;
      const n = Number(years.value) * 12;
      const r = Number(rate.value) / 100 / 12;
      const P = P0 * (1 - dp);
      const e = r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      put('#emi-figure', inr.format(Math.round(e)));
      put('#emi-down-out', `${down.value}% · ${crore(P0 * dp)}`);
      put('#emi-years-out', `${years.value} years`);
      put('#emi-rate-out', `${Number(rate.value).toFixed(2)}% a year`);
      put('#emi-loan', crore(P));
      put('#emi-total-interest', crore(e * n - P));
      put('#emi-total', crore(e * n + P0 * dp));
      put('#emi-price', crore(P0));
    };
    [price, down, years, rate].forEach((el) => el?.addEventListener('input', compute));
    // the price list can pick a home for the reader
    document.querySelectorAll('[data-pick-home]').forEach((btn) => btn.addEventListener('click', () => {
      price.value = btn.dataset.pickHome;
      document.querySelectorAll('[data-pick-home]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      compute();
      emi.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
      emi.querySelector('#emi-figure')?.focus?.();
    }));
    compute();
  }

  // ----- booking form: checked here, saved by the server (POST /api/bookings), slots read from /api/availability -----
  document.querySelectorAll('form[data-booking]').forEach((form) => {
    const fields = {
      name: { el: form.elements.name, test: (v) => v.trim().length >= 2, msg: 'Enter your name.' },
      phone: { el: form.elements.phone, test: (v) => /^(\+91[\s-]?)?[6-9]\d{9}$/.test(v.replace(/\s/g, '')), msg: 'Enter a 10 digit Indian mobile number.' },
      email: { el: form.elements.email, test: (v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), msg: 'That email address does not look right.' },
      date: { el: form.elements.date, test: (v) => v !== '' && new Date(v) >= new Date(new Date().toDateString()), msg: 'Pick a date from today onwards.' },
      slot: { el: form.elements.slot, test: (v) => v !== '' && !form.elements.slot.selectedOptions[0]?.disabled, msg: 'That slot is full. Pick another time.' },
    };
    const show = (key, ok, msg) => {
      const f = fields[key]; if (!f?.el) return;
      f.el.setAttribute('aria-invalid', String(!ok));
      const err = form.querySelector(`[data-error-for="${key}"]`); if (err) err.textContent = ok ? '' : (msg || f.msg);
    };
    Object.keys(fields).forEach((k) => fields[k].el?.addEventListener('blur', () => show(k, fields[k].test(fields[k].el.value))));
    const dateEl = fields.date.el, slotEl = fields.slot.el, hint = form.querySelector('[data-slot-hint]');
    if (dateEl) {
      const d = new Date(); dateEl.min = d.toISOString().slice(0, 10);
      d.setDate(d.getDate() + 90); dateEl.max = d.toISOString().slice(0, 10);
    }
    const loadSlots = async () => {
      if (!dateEl?.value || !slotEl) return;
      try {
        const r = await fetch(`/api/availability?date=${encodeURIComponent(dateEl.value)}`, { headers: { accept: 'application/json' } });
        const data = await r.json();
        if (!data.ok) return;
        let firstFree = null;
        for (const opt of slotEl.options) {
          const s = data.slots.find((x) => x.slot === opt.value);
          if (!s) continue;
          opt.value = s.slot; // the label changes below, and an option with no value attribute takes its label as its value
          opt.disabled = s.left <= 0;
          opt.textContent = !s.open ? `${s.slot} · closed` : s.left <= 0 ? `${s.slot} · full` : `${s.slot} · ${s.left} of 3 left`;
          if (!opt.disabled && firstFree === null) firstFree = opt.value;
        }
        if (slotEl.selectedOptions[0]?.disabled && firstFree !== null) slotEl.value = firstFree;
        if (hint) hint.textContent = firstFree === null ? 'No slots left that day. Try the day after.' : 'Three visits a slot';
        show('slot', true);
      } catch { /* the server will check again on submit */ }
    };
    dateEl?.addEventListener('change', loadSlots);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      let ok = true, first = null;
      Object.keys(fields).forEach((k) => { const pass = fields[k].el ? fields[k].test(fields[k].el.value) : true; show(k, pass); if (!pass) { ok = false; first ??= fields[k].el; } });
      if (!ok) { first?.focus(); return; }
      const button = form.querySelector('[type="submit"]');
      const label = button.textContent; button.disabled = true; button.textContent = 'Saving the booking';
      const payload = Object.fromEntries(new FormData(form));
      try {
        const r = await fetch(form.action, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(payload) });
        const data = await r.json();
        if (!data.ok) {
          if (data.errors) { Object.entries(data.errors).forEach(([k, msg]) => show(k, false, msg)); form.querySelector('[aria-invalid="true"]')?.focus(); if (data.errors.slot) loadSlots(); }
          else show('slot', false, data.error || 'The booking was not saved. Call the lounge.');
          return;
        }
        const b = data.booking;
        const when = new Date(b.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
        const done = form.parentElement.querySelector('.success');
        form.hidden = true;
        if (done) {
          done.hidden = false;
          done.querySelector('[data-ref]').textContent = b.ref;
          done.querySelector('[data-when]').textContent = `${when}, ${b.slot}`;
          done.querySelector('[data-project]').textContent = b.project;
          done.querySelector('[data-booking-link]').href = `/booking/${b.ref}`;
          done.querySelector('h2, h3')?.focus?.();
        }
      } catch {
        show('slot', false, 'The server did not answer. Check the connection and try again.');
      } finally { button.disabled = false; button.textContent = label; }
    });
    form.parentElement.querySelector('.success [data-again]')?.addEventListener('click', () => { form.hidden = false; form.parentElement.querySelector('.success').hidden = true; form.reset(); form.elements.name.focus(); });
  });

  // ----- enquiry form: a question saved for the lounge (POST /api/enquiries) -----
  document.querySelectorAll('form[data-enquiry]').forEach((form) => {
    const err = form.querySelector('[data-enquiry-error]');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = Object.fromEntries(new FormData(form));
      const button = form.querySelector('[type="submit"]'); button.disabled = true;
      try {
        const r = await fetch(form.action, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(payload) });
        const data = await r.json();
        if (!data.ok) { err.textContent = data.errors ? Object.values(data.errors).join(' ') : data.error; return; }
        err.textContent = '';
        const done = form.parentElement.querySelector('.success');
        form.hidden = true; done.hidden = false; done.querySelector('[data-ref]').textContent = data.enquiry.ref; done.querySelector('h2, h3')?.focus?.();
      } catch { err.textContent = 'The server did not answer. Try again, or call the lounge.'; }
      finally { button.disabled = false; }
    });
    if (new URLSearchParams(location.search).get('asked')) { form.hidden = true; const done = form.parentElement.querySelector('.success'); done.hidden = false; done.querySelector('[data-ref]').textContent = new URLSearchParams(location.search).get('asked'); }
  });

  // ----- cancelling a booking from its page -----
  document.querySelectorAll('form[data-cancel]').forEach((form) => {
    form.addEventListener('submit', (e) => { if (!confirm('Cancel this visit? You can book again any time.')) e.preventDefault(); });
  });

  // ----- FAQ: one open at a time, in groups that ask for it -----
  document.querySelectorAll('[data-one-open]').forEach((group) => {
    group.addEventListener('toggle', (e) => {
      if (!e.target.open) return;
      group.querySelectorAll('details[open]').forEach((d) => { if (d !== e.target) d.open = false; });
    }, true);
  });

  // ----- sales lounge: open now or not, from the clock -----
  document.querySelectorAll('[data-open-now]').forEach((el) => {
    const now = new Date();
    const day = now.getDay(), h = now.getHours() + now.getMinutes() / 60;
    const open = day === 0 ? h >= 11 && h < 17 : h >= 10 && h < 19;
    const closes = day === 0 ? '17:00' : '19:00';
    const opens = day === 6 ? '11:00 tomorrow' : '10:00 tomorrow';
    el.textContent = open ? `Sales lounge open now, until ${closes}` : `Sales lounge closed, opens ${opens}`;
  });
})();

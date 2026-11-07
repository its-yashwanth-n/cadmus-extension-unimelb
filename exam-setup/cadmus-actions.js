/*
 * Cadmus Tools - core page automation.
 *
 * Shared by the browser extension (injected into the page's MAIN world) and
 * the bookmarklet. Defines window.CadmusTools.run(options), which returns a
 * Promise resolving to an array of { action, ok, message } results.
 *
 * Every action runs once per call and is skipped unless enabled:
 * options = {
 *   examType:       { enabled },                  // assessment type Exam + exam type "Final exam"
 *   shiftStart:     { enabled, value: 2, direction: 'earlier' | 'later' },   // move exam start
 *   extendWriting:  { enabled, value: 2, direction: 'add' | 'subtract' },    // change writing time
 *   autoSubmission: { enabled, value: 30 },       // Auto Submission off, late limit N minutes
 *   marking:        { enabled },                  // Turnitin Feedback Studio
 *   totalPoints:    { enabled, value: 100 },
 *   spellCheck:     { enabled },                  // Spell Check on
 *   proctoring:     { enabled, choice: 'schoolyear' | 'lockdown' }  // Advanced exam settings
 * }
 */
(function () {
  'use strict';

  const CONTROL_SEL =
    '[role="switch"],[role="checkbox"],[role="radio"],input[type="checkbox"],input[type="radio"]';

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const pad = (n) => String(n).padStart(2, '0');

  async function waitFor(fn, timeout = 3000, interval = 100) {
    const end = Date.now() + timeout;
    for (;;) {
      const v = fn();
      if (v) return v;
      if (Date.now() > end) return null;
      await sleep(interval);
    }
  }

  // Set a value on a React-controlled input so React's onChange fires.
  function setNativeValue(input, value) {
    const proto =
      input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    input.focus();
    setter.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.blur();
  }

  function getFiber(el) {
    const key = Object.keys(el).find(
      (k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
    );
    return key ? el[key] : null;
  }

  function isOn(c) {
    if (c.hasAttribute('aria-checked')) return c.getAttribute('aria-checked') === 'true';
    if (c.hasAttribute('data-state')) return c.getAttribute('data-state') === 'checked';
    return c.checked === true;
  }

  function findButtonByText(re, root = document) {
    return [...root.querySelectorAll('button,[role="button"]')].find((b) => re.test(norm(b.textContent)));
  }

  // ---------------------------------------------------------------- dates

  // "YYYY-MM-DD HH:mm[:ss]" (local wall-clock) -> components
  function parseLocal(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(s);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  }

  function formatLocal(d) {
    return (
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
      `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    );
  }

  function describe(v) {
    if (v instanceof Date) return v.toLocaleString();
    if (v && typeof v.toDate === 'function') return v.toDate().toLocaleString();
    return String(v);
  }

  // Returns a value of the same "shape" as v, shifted by deltaMin minutes.
  function shiftValue(v, deltaMin) {
    const ms = deltaMin * 60000;
    if (v instanceof Date) return new Date(v.getTime() + ms);
    if (v && typeof v.add === 'function' && typeof v.toDate === 'function') return v.add(deltaMin, 'minute'); // dayjs/moment
    if (typeof v === 'string') {
      const local = parseLocal(v);
      if (local) return formatLocal(new Date(local.getTime() + ms));
      const t = Date.parse(v);
      if (!isNaN(t)) return new Date(t + ms).toISOString();
    }
    return null;
  }

  function looksLikeDate(v) {
    return (
      v instanceof Date ||
      (v && typeof v.toDate === 'function') ||
      (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v))
    );
  }

  // ------------------------------------------------------- exam start

  function findExamStartButton() {
    const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter((h) =>
      /^exam start$/i.test(norm(h.textContent))
    );
    for (const h of headings) {
      let el = h.nextElementSibling;
      for (let i = 0; el && i < 5; i++, el = el.nextElementSibling) {
        const btn = el.querySelector('.mantine-DateTimePicker-input, button[data-dates-input]');
        if (btn) return btn;
      }
    }
    return document.querySelector('.mantine-DateTimePicker-input');
  }

  // Walk up the React tree from the picker button to the DateTimePicker's props.
  function findPickerProps(btn) {
    let f = getFiber(btn);
    for (let depth = 0; f && depth < 40; depth++, f = f.return) {
      const p = f.memoizedProps;
      if (p && typeof p === 'object' && typeof p.onChange === 'function') {
        const v = p.value !== undefined ? p.value : p.defaultValue;
        if (looksLikeDate(v)) return { props: p, value: v };
      }
    }
    return null;
  }

  // Fallback: drive the Mantine dropdown's time field (same-day changes only).
  async function shiftViaDropdown(btn, newDate) {
    btn.click();
    const dd = await waitFor(() => {
      const id = btn.getAttribute('aria-controls');
      return id && document.getElementById(id);
    }, 2000);
    if (!dd) throw new Error('date picker dropdown did not open');
    const time = dd.querySelector('input[type="time"]');
    if (!time) throw new Error('no time field found in date picker');
    const withSeconds = time.step && Number(time.step) < 60;
    setNativeValue(
      time,
      `${pad(newDate.getHours())}:${pad(newDate.getMinutes())}` + (withSeconds ? `:${pad(newDate.getSeconds())}` : '')
    );
    await sleep(150);
    const submit =
      dd.querySelector('.mantine-DateTimePicker-submitButton') || findButtonByText(/^(ok|apply|done|save)$/i, dd);
    if (submit) submit.click();
    else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  }

  // deltaMin < 0 moves the start earlier, > 0 later.
  async function shiftExamStart(deltaMin) {
    const btn = findExamStartButton();
    if (!btn) throw new Error('could not find the "Exam Start" date picker on this page');
    const hidden = btn.closest('.mantine-DateTimePicker-root')?.parentElement?.querySelector('input[type="hidden"]');
    const beforeText = norm(btn.textContent);

    const found = findPickerProps(btn);
    if (found) {
      const next = shiftValue(found.value, deltaMin);
      if (next == null) throw new Error('unrecognised date value: ' + String(found.value));
      found.props.onChange(next);
      const changed = await waitFor(() => norm(btn.textContent) !== beforeText, 1500);
      if (changed) return `Exam start ${beforeText} → ${norm(btn.textContent)}`;
    }

    // Fallback path via the UI.
    const cur = hidden ? parseLocal(hidden.value) : null;
    if (!cur) throw new Error('could not read the current exam start time');
    const next = new Date(cur.getTime() + deltaMin * 60000);
    if (next.toDateString() !== cur.toDateString()) {
      throw new Error('new start time crosses midnight - please change the date manually');
    }
    await shiftViaDropdown(btn, next);
    const changed = await waitFor(() => norm(btn.textContent) !== beforeText, 1500);
    if (!changed) throw new Error('exam start did not change (still ' + beforeText + ')');
    return `Exam start ${beforeText} → ${norm(btn.textContent)}`;
  }

  // ----------------------------------------------------- writing time

  function findWritingTimeInput() {
    const byLabel = [...document.querySelectorAll('input[aria-label]')].find((i) =>
      /^writing time/i.test(i.getAttribute('aria-label'))
    );
    if (byLabel) return byLabel;
    const label = [...document.querySelectorAll('label')].find((l) =>
      /minutes to complete the exam/i.test(l.textContent)
    );
    return label ? label.querySelector('input') : null;
  }

  async function changeWritingTime(deltaMin) {
    const input = findWritingTimeInput();
    if (!input) throw new Error('could not find the "Writing time (in minutes)" field');
    const cur = parseInt(input.value, 10);
    if (isNaN(cur)) throw new Error('writing time field is empty or not a number: "' + input.value + '"');
    const next = cur + deltaMin;
    if (next < 1) throw new Error(`writing time would be ${next} minutes - not changed`);
    setNativeValue(input, next);
    await sleep(300);
    if (parseInt(input.value, 10) !== next) {
      throw new Error(`writing time did not stick (shows ${input.value}, expected ${next})`);
    }
    return `Writing time ${cur} → ${next} minutes`;
  }

  // ------------------------------------------------- simple settings

  // Text of a control's own label (label[for], aria-label, wrapping label).
  function directLabel(c) {
    const parts = [c.getAttribute('aria-label')];
    if (c.id) {
      try {
        document.querySelectorAll(`label[for="${CSS.escape(c.id)}"]`).forEach((l) => parts.push(l.textContent));
      } catch (e) {
        /* ignore */
      }
    }
    parts.push(c.closest('label')?.textContent);
    return norm(parts.filter(Boolean).join(' '));
  }

  function findSwitch(re) {
    return [...document.querySelectorAll('[role="switch"]')].find((c) => re.test(directLabel(c))) || null;
  }

  async function ensureSwitch(re, name, wantOn) {
    const c = findSwitch(re);
    if (!c) throw new Error(`could not find the "${name}" switch`);
    if (isOn(c) === wantOn) return `${name} already ${wantOn ? 'on' : 'off'}`;
    c.click();
    const ok = await waitFor(() => isOn(findSwitch(re) || c) === wantOn, 1500);
    if (!ok) throw new Error(`clicked "${name}" but it did not turn ${wantOn ? 'on' : 'off'}`);
    return `${name} turned ${wantOn ? 'on' : 'off'}`;
  }

  function findInputByLabel(re) {
    return [...document.querySelectorAll('input[aria-label]')].find((i) => re.test(i.getAttribute('aria-label')));
  }

  async function setNumberField(re, name, value) {
    const input = await waitFor(() => findInputByLabel(re), 2000);
    if (!input) throw new Error(`could not find the "${name}" field`);
    const before = input.value;
    if (String(parseInt(before, 10)) === String(value)) return `${name} already ${value}`;
    setNativeValue(input, value);
    await sleep(300);
    if (parseInt(input.value, 10) !== Number(value)) {
      throw new Error(`${name} did not stick (shows ${input.value}, expected ${value})`);
    }
    return `${name} ${before || '(empty)'} → ${value}`;
  }

  async function setExamType() {
    const msgs = [];
    const radio = document.querySelector('[role="radio"][value="EXAM"]');
    if (!radio) throw new Error('could not find the "Exam" assessment type option');
    if (isOn(radio)) {
      msgs.push('Assessment type already Exam');
    } else {
      radio.click();
      if (!(await waitFor(() => isOn(radio), 1500))) throw new Error('clicked "Exam" but it was not selected');
      msgs.push('Assessment type set to Exam');
    }
    const finalBtn = await waitFor(
      () => [...document.querySelectorAll('[aria-pressed]')].find((b) => /^final exam$/i.test(norm(b.textContent))),
      3000
    );
    if (!finalBtn) throw new Error(msgs.join('; ') + ', but no "Final exam" exam type button was found');
    if (finalBtn.getAttribute('aria-pressed') === 'true') {
      msgs.push('Final exam already selected');
    } else {
      finalBtn.click();
      if (!(await waitFor(() => finalBtn.getAttribute('aria-pressed') === 'true', 1500))) {
        throw new Error('clicked "Final exam" but it was not selected');
      }
      msgs.push('Final exam selected');
    }
    return msgs.join('; ');
  }

  async function autoSubmissionOff(lateMinutes) {
    const a = await ensureSwitch(/^auto submission$/i, 'Auto Submission', false);
    const b = await setNumberField(/^late submission time limit/i, 'Late submission limit', lateMinutes);
    return `${a}; ${b} min`;
  }

  async function setMarkingTurnitin() {
    const radio =
      document.querySelector('input[type="radio"][name="gradingService"][value="turnitin"]') ||
      [...document.querySelectorAll('input[type="radio"]')].find((r) =>
        /turnitin feedback studio/i.test(directLabel(r))
      );
    if (!radio) throw new Error('could not find the "Use Turnitin Feedback Studio for marking" option');
    if (radio.checked) return 'Marking tool already Turnitin Feedback Studio';
    radio.click();
    if (!(await waitFor(() => radio.checked, 1500))) throw new Error('clicked Turnitin Feedback Studio but it was not selected');
    return 'Marking tool set to Turnitin Feedback Studio';
  }

  // ------------------------------------------- advanced exam settings

  // directLabel plus aria-labelledby and surrounding text.
  function controlLabel(c) {
    const parts = [directLabel(c)];
    const lb = c.getAttribute('aria-labelledby');
    if (lb) lb.split(/\s+/).forEach((id) => parts.push(document.getElementById(id)?.textContent));
    // Nearby text, as long as the ancestor holds only this one control.
    let a = c.parentElement;
    for (let i = 0; a && i < 4; i++, a = a.parentElement) {
      if (a.querySelectorAll(CONTROL_SEL).length > 1) break;
      parts.push(a.textContent);
    }
    return norm(parts.filter(Boolean).join(' '));
  }

  const PROCTORING = {
    schoolyear: { name: 'Schoolyear', test: (t) => /school\s*year/i.test(t) },
    lockdown: { name: 'Lockdown browser', test: (t) => /lock\s*-?\s*down/i.test(t) && !/school\s*year/i.test(t) },
  };

  // Prefer a control whose own label matches; fall back to nearby text.
  function findProctoringControl(choice) {
    const test = PROCTORING[choice].test;
    const all = [...document.querySelectorAll(CONTROL_SEL)];
    return all.find((c) => test(directLabel(c))) || all.find((c) => test(controlLabel(c))) || null;
  }

  async function ensureProctoring(choice) {
    const want = PROCTORING[choice];
    if (!want) throw new Error('unknown choice: ' + choice);
    const other = choice === 'schoolyear' ? 'lockdown' : 'schoolyear';

    let c = findProctoringControl(choice);
    let opened = false;
    if (!c) {
      const adv = findButtonByText(/advanced exam settings/i);
      if (!adv) throw new Error('could not find the "Advanced exam settings" button');
      adv.click();
      opened = true;
      c = await waitFor(() => findProctoringControl(choice), 4000);
      if (!c) throw new Error(`opened Advanced exam settings but found no ${want.name} option`);
    }

    let msg;
    if (isOn(c)) {
      msg = `${want.name} already on`;
    } else {
      c.click();
      const on = await waitFor(() => isOn(findProctoringControl(choice) || c), 1500);
      if (!on) throw new Error(`clicked ${want.name} but it did not turn on`);
      msg = `${want.name} turned on`;
    }

    // If the two are separate switches/checkboxes (not one radio group), turn the other one off.
    const o = findProctoringControl(other);
    if (o && o !== c && isOn(o) && !/radio/.test(o.getAttribute('role') || o.type || '')) {
      o.click();
      await waitFor(() => !isOn(o), 1500);
      msg += isOn(o) ? `; could not turn ${PROCTORING[other].name} off` : `; ${PROCTORING[other].name} turned off`;
    }

    // If the setting lives in a dialog, confirm it so the change is kept.
    const dialog = c.closest('[role="dialog"],[aria-modal="true"]');
    if (dialog) {
      const save = findButtonByText(/^(save|apply|done|confirm|update)\b/i, dialog);
      if (save && !save.disabled) {
        save.click();
        msg += ' (clicked "' + norm(save.textContent) + '" in the settings dialog)';
      } else {
        msg += ' (settings dialog left open - please review and close it)';
      }
    } else if (opened) {
      msg += ' (Advanced exam settings expanded)';
    }
    return msg;
  }

  // ------------------------------------------------------------- run

  async function run(options = {}) {
    const results = [];
    const step = async (action, fn) => {
      try {
        results.push({ action, ok: true, message: await fn() });
      } catch (e) {
        results.push({ action, ok: false, message: e && e.message ? e.message : String(e) });
      }
    };

    const o = { ...options };
    // Older saved settings: { schoolyear: { enabled } } and { minutes } instead of { value }.
    if (o.schoolyear && !o.proctoring) o.proctoring = { enabled: o.schoolyear.enabled, choice: 'schoolyear' };
    const on = (k) => o[k] && o[k].enabled;
    const num = (k) => Number(o[k].value !== undefined ? o[k].value : o[k].minutes) || 0;

    // Assessment type first: it decides which other sections the page shows.
    if (on('examType')) await step('Exam type: Final exam', setExamType);
    if (on('extendWriting')) {
      const sub = o.extendWriting.direction === 'subtract';
      await step(sub ? 'Reduce writing time' : 'Extend writing time', () =>
        changeWritingTime(sub ? -num('extendWriting') : num('extendWriting'))
      );
    }
    if (on('shiftStart')) {
      const later = o.shiftStart.direction === 'later';
      await step(later ? 'Move exam start later' : 'Move exam start earlier', () =>
        shiftExamStart(later ? num('shiftStart') : -num('shiftStart'))
      );
    }
    if (on('autoSubmission')) await step('Auto Submission off', () => autoSubmissionOff(num('autoSubmission')));
    if (on('marking')) await step('Marking tool', setMarkingTurnitin);
    if (on('totalPoints')) {
      await step('Total points', () => setNumberField(/total points/i, 'Total points', num('totalPoints')));
    }
    if (on('spellCheck')) await step('Spell Check on', () => ensureSwitch(/^spell check$/i, 'Spell Check', true));
    // Last, because it may open a dialog.
    if (on('proctoring')) {
      const choice = o.proctoring.choice === 'lockdown' ? 'lockdown' : 'schoolyear';
      await step('Advanced exam settings: ' + PROCTORING[choice].name, () => ensureProctoring(choice));
    }
    if (!results.length) results.push({ action: 'Nothing to do', ok: true, message: 'All actions are disabled' });
    return results;
  }

  // Small results box on the page, for one-click runs that have no popup to show results in.
  function toast(results) {
    const id = 'cadmus-tools-toast';
    document.getElementById(id)?.remove();
    const box = document.createElement('div');
    box.id = id;
    box.style.cssText =
      'position:fixed;right:16px;bottom:16px;z-index:2147483647;width:340px;max-height:60vh;overflow:auto;' +
      'padding:10px 12px;background:#fff;color:#1c2434;border:1px solid #c9d1e0;border-radius:8px;' +
      'box-shadow:0 6px 24px rgba(0,0,0,.18);font:13px/1.4 system-ui,sans-serif;text-align:left;cursor:pointer';
    box.title = 'Click to close';
    box.onclick = () => box.remove();
    for (const r of results) {
      const d = document.createElement('div');
      d.style.cssText = 'margin:4px 0;padding:5px 8px;border-radius:6px;background:' + (r.ok ? '#e6f6ec' : '#fde8e8');
      const b = document.createElement('b');
      b.style.display = 'block';
      b.textContent = (r.ok ? '✓ ' : '✗ ') + r.action;
      d.append(b, r.message);
      box.append(d);
    }
    document.body.appendChild(box);
    // Keep it up if something failed; otherwise fade away.
    if (results.every((r) => r.ok)) setTimeout(() => box.remove(), 4000);
  }

  window.CadmusTools = { version: 2, run, toast };
})();

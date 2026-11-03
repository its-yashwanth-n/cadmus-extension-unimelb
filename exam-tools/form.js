// Builds the options form from CADMUS_UI. Shared by the extension popup and the bookmarklet panel.
globalThis.CadmusForm = {
  defaults(ui) {
    const o = {};
    for (const f of ui.fields) o[f.key] = { ...f.default };
    return o;
  },

  // Merge saved options over defaults (accepts the old { minutes } and { schoolyear } shapes).
  merge(ui, saved) {
    const o = this.defaults(ui);
    saved = saved || {};
    if (saved.schoolyear && !saved.proctoring) saved.proctoring = { enabled: saved.schoolyear.enabled, choice: 'schoolyear' };
    for (const f of ui.fields) {
      const s = saved[f.key];
      if (!s) continue;
      if (typeof s.enabled === 'boolean') o[f.key].enabled = s.enabled;
      const v = s.value !== undefined ? s.value : s.minutes;
      if (f.type === 'number' && v !== undefined) o[f.key].value = v;
      if (f.directions && f.directions.some((d) => d.value === s.direction)) o[f.key].direction = s.direction;
      if (f.type === 'choice' && f.choices.some((c) => c.value === s.choice)) o[f.key].choice = s.choice;
    }
    return o;
  },

  render(ui, container, opts) {
    container.textContent = '';
    for (const f of ui.fields) {
      const row = document.createElement('label');
      row.className = 'cadmus-row';
      row.style.cssText = 'display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin:7px 0;cursor:pointer';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.dataset.key = f.key;
      cb.checked = !!opts[f.key].enabled;
      const text = document.createElement('span');
      text.textContent = f.label;
      row.append(cb, text);
      if (f.directions) row.append(this.select(f.directions, opts[f.key].direction, { direction: f.key }));
      if (f.type === 'number') {
        const n = document.createElement('input');
        n.type = 'number';
        n.min = '0';
        n.max = '1000';
        n.dataset.value = f.key;
        n.value = opts[f.key].value;
        n.style.width = '52px';
        row.append(n, f.unit || '');
      } else if (f.type === 'choice') {
        row.append(this.select(f.choices, opts[f.key].choice, { choice: f.key }));
      }
      container.append(row);
    }
  },

  select(items, selected, data) {
    const sel = document.createElement('select');
    Object.assign(sel.dataset, data);
    for (const c of items) sel.add(new Option(c.label, c.value, false, c.value === selected));
    return sel;
  },

  read(ui, container) {
    const o = {};
    for (const f of ui.fields) {
      o[f.key] = { enabled: container.querySelector(`[data-key="${f.key}"]`).checked };
      if (f.type === 'number') o[f.key].value = Number(container.querySelector(`[data-value="${f.key}"]`).value) || 0;
      if (f.type === 'choice') o[f.key].choice = container.querySelector(`[data-choice="${f.key}"]`).value;
      if (f.directions) o[f.key].direction = container.querySelector(`[data-direction="${f.key}"]`).value;
    }
    return o;
  },

  showResults(container, results) {
    container.textContent = '';
    for (const r of results) {
      const d = document.createElement('div');
      d.style.cssText =
        'margin-top:6px;padding:6px 8px;border-radius:6px;background:' + (r.ok ? '#e6f6ec' : '#fde8e8');
      const b = document.createElement('b');
      b.style.display = 'block';
      b.textContent = (r.ok ? '✓ ' : '✗ ') + r.action;
      d.append(b, r.message);
      container.append(d);
    }
  },
};

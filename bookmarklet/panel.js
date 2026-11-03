// Bookmarklet UI: a floating panel with the same options as the extension popup.
// build-bookmarklet.js concatenates config.js + form.js + cadmus-actions.js + this file.
(function () {
  'use strict';
  const ui = globalThis.CADMUS_UI;
  const F = globalThis.CadmusForm;
  const id = 'cadmus-tools-panel-' + ui.storageKey;

  const old = document.getElementById(id);
  if (old) {
    old.remove();
    return;
  }

  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(ui.storageKey));
  } catch (e) {
    /* storage unavailable - use defaults */
  }

  const panel = document.createElement('div');
  panel.id = id;
  panel.style.cssText =
    'position:fixed;top:16px;right:16px;z-index:2147483647;width:340px;max-height:90vh;overflow:auto;' +
    'padding:12px 14px;background:#fff;color:#1c2434;border:1px solid #c9d1e0;border-radius:8px;' +
    'box-shadow:0 6px 24px rgba(0,0,0,.18);font:13px/1.4 system-ui,sans-serif;text-align:left;';

  const head = document.createElement('div');
  head.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:4px';
  const title = document.createElement('b');
  title.style.fontSize = '14px';
  title.textContent = ui.title;
  const close = document.createElement('button');
  close.textContent = '×';
  close.style.cssText = 'border:0;background:none;font-size:18px;cursor:pointer;line-height:1';
  close.onclick = () => panel.remove();
  head.append(title, close);

  const fields = document.createElement('div');
  F.render(ui, fields, F.merge(ui, saved));

  const run = document.createElement('button');
  run.textContent = 'Apply to this page';
  run.style.cssText =
    'width:100%;margin-top:8px;padding:7px;border:0;border-radius:6px;background:#2f5bea;color:#fff;font-weight:600;cursor:pointer';
  const note = document.createElement('div');
  note.style.cssText = 'color:#5b6f98;font-size:12px;margin-top:6px';
  note.textContent = 'Runs once per click. Nothing is re-applied afterwards.';
  const out = document.createElement('div');

  const read = () => {
    const o = F.read(ui, fields);
    try {
      localStorage.setItem(ui.storageKey, JSON.stringify(o));
    } catch (e) {
      /* ignore */
    }
    return o;
  };
  fields.addEventListener('change', read);
  run.onclick = async () => {
    run.disabled = true;
    out.textContent = 'Working…';
    F.showResults(out, await window.CadmusTools.run(read()));
    run.disabled = false;
  };

  panel.append(head, fields, run, note, out);
  document.body.appendChild(panel);
})();

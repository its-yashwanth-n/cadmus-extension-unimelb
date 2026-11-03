// One-click bookmarklet: applies the settings last saved in the panel bookmarklet (or the defaults), no panel.
(function () {
  'use strict';
  const ui = globalThis.CADMUS_UI;
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(ui.storageKey));
  } catch (e) {
    /* storage unavailable - use defaults */
  }
  window.CadmusTools.run(globalThis.CadmusForm.merge(ui, saved)).then((r) => window.CadmusTools.toast(r));
})();

// Runs the saved options on a tab. Shared by the popup and the background script.
globalThis.CadmusRunner = {
  api: globalThis.browser || globalThis.chrome,

  async loadSettings() {
    const s = await this.api.storage.local.get(['options', 'oneClick']);
    return { options: globalThis.CadmusForm.merge(globalThis.CADMUS_UI, s.options), oneClick: !!s.oneClick };
  },

  // With an empty popup, clicking the toolbar icon fires action.onClicked instead of opening the popup.
  applyOneClick(oneClick) {
    return this.api.action.setPopup({ popup: oneClick ? '' : 'popup.html' });
  },

  isCadmus(tab) {
    return !!tab && /^https?:\/\/([^/]+\.)?cadmus\.io\//.test(tab.url || '');
  },

  // Returns the results array. With toast=true the results are also shown on the page.
  async runOnTab(tab, options, toast) {
    if (tab && tab.url && !this.isCadmus(tab)) {
      return [{ action: 'Wrong page', ok: false, message: 'Open the Cadmus assessment settings page first.' }];
    }
    try {
      // MAIN world so the script can reach React's internals on the page.
      await this.api.scripting.executeScript({ target: { tabId: tab.id }, world: 'MAIN', files: ['cadmus-actions.js'] });
      const [res] = await this.api.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        func: (opts, showToast) =>
          window.CadmusTools.run(opts).then((r) => {
            if (showToast) window.CadmusTools.toast(r);
            return r;
          }),
        args: [options, !!toast],
      });
      return res && res.result ? res.result : [{ action: 'Run', ok: false, message: 'No result returned' }];
    } catch (e) {
      return [{ action: 'Error', ok: false, message: e.message || String(e) }];
    }
  },
};

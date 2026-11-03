// Keyboard shortcut and one-click toolbar icon. Chrome loads this as a service worker
// (so it imports its helpers); Firefox loads the helpers first via background.scripts.
if (typeof importScripts === 'function' && !globalThis.CadmusRunner) {
  importScripts('config.js', 'form.js', 'runner.js');
}

const R = globalThis.CadmusRunner;
const api = R.api;

// Show a short badge on the icon when the page can't show the results itself.
function flagIcon(results) {
  const ok = results.every((r) => r.ok);
  api.action.setBadgeBackgroundColor({ color: ok ? '#1f9d55' : '#d93025' });
  api.action.setBadgeText({ text: ok ? '✓' : '!' });
  setTimeout(() => api.action.setBadgeText({ text: '' }), 5000);
}

async function runSaved(tab) {
  if (!tab) [tab] = await api.tabs.query({ active: true, currentWindow: true });
  const { options } = await R.loadSettings();
  flagIcon(await R.runOnTab(tab, options, true));
}

async function syncPopup() {
  const { oneClick } = await R.loadSettings();
  await R.applyOneClick(oneClick);
}

api.commands.onCommand.addListener((command, tab) => {
  if (command === 'run-saved') runSaved(tab);
});
api.action.onClicked.addListener((tab) => runSaved(tab));
api.storage.onChanged.addListener((changes) => {
  if (changes.oneClick) R.applyOneClick(!!changes.oneClick.newValue);
});
api.runtime.onStartup.addListener(syncPopup);
api.runtime.onInstalled.addListener(syncPopup);
syncPopup();

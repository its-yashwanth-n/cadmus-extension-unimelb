// Used by both popup.html and options.html (options.html has no Apply button).
const ui = globalThis.CADMUS_UI;
const F = globalThis.CadmusForm;
const R = globalThis.CadmusRunner;
const api = R.api;

const $ = (id) => document.getElementById(id);

async function load() {
  document.title = $('title').textContent = ui.title;
  const { options, oneClick } = await R.loadSettings();
  F.render(ui, $('fields'), options);
  $('oneClick').checked = oneClick;
  try {
    const cmd = (await api.commands.getAll()).find((c) => c.name === 'run-saved');
    if (cmd && cmd.shortcut) $('shortcut').textContent = cmd.shortcut;
  } catch (e) {
    /* commands API unavailable */
  }
}

async function runOnPage() {
  const options = F.read(ui, $('fields'));
  await api.storage.local.set({ options });
  $('run').disabled = true;
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  F.showResults($('results'), await R.runOnTab(tab, options, false));
  $('run').disabled = false;
}

$('fields').addEventListener('change', () => api.storage.local.set({ options: F.read(ui, $('fields')) }));
$('oneClick').addEventListener('change', async () => {
  const oneClick = $('oneClick').checked;
  await api.storage.local.set({ oneClick });
  await R.applyOneClick(oneClick);
});
if ($('run')) $('run').addEventListener('click', runOnPage);
load();

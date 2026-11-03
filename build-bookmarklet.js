// Builds both versions from the shared files in exam-tools/:
//  - copies the shared scripts into exam-setup/
//  - builds a bookmarklet for each version into bookmarklet/
// Usage: node build-bookmarklet.js
const fs = require('fs');
const path = require('path');

const root = __dirname;
const SHARED = ['cadmus-actions.js', 'form.js', 'runner.js', 'background.js', 'popup.html', 'options.html', 'popup.js', 'popup.css'];
const VERSIONS = [
  { dir: 'exam-tools', name: 'Cadmus Exam Tools', file: 'exam-tools' },
  { dir: 'exam-setup', name: 'Cadmus Exam Setup', file: 'exam-setup' },
];

for (const f of SHARED) fs.copyFileSync(path.join(root, 'exam-tools', f), path.join(root, 'exam-setup', f));

const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');

// Strip whole-line // comments and block comments at line starts; keeps strings intact.
const strip = (src) =>
  src
    .replace(/^\s*\/\*[\s\S]*?\*\/\s*$/gm, '')
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l))
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');

const outDir = path.join(root, 'bookmarklet');
const KINDS = [
  { ui: 'panel.js', suffix: '', label: (n) => n + ' (settings panel)' },
  { ui: 'quick.js', suffix: '-quick', label: (n) => '⚡ ' + n + ' (one-click)' },
];
const links = [];
for (const v of VERSIONS) {
  for (const k of KINDS) {
    const parts = [read(v.dir, 'config.js'), read('exam-tools', 'form.js'), read('exam-tools', 'cadmus-actions.js'), read('bookmarklet', k.ui)];
    const code = `(function(){${parts.map(strip).join('\n')}\n})();void 0;`;
    new Function(code); // syntax check
    const url = 'javascript:' + encodeURIComponent(code);
    const file = v.file + k.suffix + '.txt';
    fs.writeFileSync(path.join(outDir, file), url);
    links.push(`  <p><a class="bm" href="${url.replace(/"/g, '&quot;')}">${k.label(v.name)}</a>
     <br><small>Can't drag? Paste the contents of <code>${file}</code> as a bookmark's URL.</small></p>`);
    console.log(`${k.label(v.name)}: ${url.length} chars -> bookmarklet/${file}`);
  }
}

const old = path.join(outDir, 'bookmarklet.txt');
if (fs.existsSync(old)) fs.unlinkSync(old);

fs.writeFileSync(
  path.join(outDir, 'install.html'),
  `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Cadmus bookmarklets</title>
<style>
  body{font:15px/1.5 system-ui,sans-serif;max-width:640px;margin:40px auto;padding:0 16px;color:#1c2434}
  a.bm{display:inline-block;padding:10px 16px;background:#2f5bea;color:#fff;border-radius:8px;text-decoration:none;font-weight:600}
  code{background:#eef1f7;padding:1px 5px;border-radius:4px}
</style></head>
<body>
  <h1>Cadmus bookmarklets</h1>
  <p>Drag a button onto your bookmarks bar (Chrome or Firefox):</p>
${links.join('\n')}
  <p><b>Settings panel</b>: on the Cadmus assessment settings page, click it to open a panel top-right where you can
     tick or untick each action and click <b>Apply</b>. Your choices are saved. Click the bookmark again to close the panel.</p>
  <p><b>⚡ One-click</b>: applies the choices you last saved in that version's settings panel (or the defaults if you
     never opened it) straight away, and shows the results bottom-right. Each click runs once.</p>
</body></html>
`
);
console.log('Wrote bookmarklet/install.html');

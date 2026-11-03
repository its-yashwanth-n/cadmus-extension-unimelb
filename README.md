# Cadmus Exam Tools & Exam Setup

There are two versions, each available as a Chrome/Firefox extension and as a bookmarklet. Both run on the Cadmus
assessment settings page. Every action has its own checkbox (and a value where it needs one), and your choices are remembered.

**Each action runs once, when you click Apply.** Nothing stays running in the background or re-applies itself, so
you can change any setting by hand afterwards.

### Cadmus Exam Tools (`exam-tools/`)
| Action | What it does |
| --- | --- |
| Move exam start | Moves **Exam Start** earlier or later by N minutes (default: earlier by 2) |
| Writing time | Adds or subtracts N minutes (default: add 2) |
| Advanced exam settings | Turns on **Schoolyear** or **Lockdown** (you pick which) |

### Cadmus Exam Setup (`exam-setup/`)
| Action | What it does |
| --- | --- |
| Exam / Final exam | Sets Assessment Type to **Exam** and selects **Final exam** under Exam Type |
| Move exam start | Earlier or later by N minutes (unticked by default) |
| Writing time | Add or subtract N minutes (unticked by default) |
| Auto Submission | Turns **Auto Submission** off and sets the late submission limit to N minutes (default 30) |
| Marking tool | Selects **Use Turnitin Feedback Studio for marking** |
| Total points | Sets **Total points** to N (default 100) |
| Spell Check | Makes sure **Spell Check** is on |
| Advanced exam settings | Turns on **Schoolyear** or **Lockdown** (you pick which) |

Notes:
- **Schoolyear / Lockdown:** opens *Advanced exam settings* if needed and turns on the one you picked. If the two
  are separate switches, the other one is turned off. If the setting is in a dialog, its Save/Apply/Done button is clicked.
- Settings that are already correct are left alone. The result list says "already …" for those.
- The time actions apply again on every run (each run moves the start and changes the writing time again), so check the before → after values.
- Neither version clicks **Confirm Changes**. Review the page and confirm it yourself.

## One-click use (after your settings are done)
Set your options once in the popup, then use either of these:
- **Keyboard shortcut:** **Alt+Shift+1** runs Exam Tools and **Alt+Shift+2** runs Exam Setup, using your saved
  settings. You can change the keys at `chrome://extensions/shortcuts` (Chrome), or in Firefox at about:addons →
  ⚙ → *Manage Extension Shortcuts*.
- **One-click icon:** in the popup, tick **One-click**. After that, clicking the toolbar icon applies your settings
  straight away, without opening the popup. To change settings later, open the extension's **Options** page: right-click
  the icon → *Options* (Chrome), or about:addons → the extension → *Options* (Firefox). You can also untick One-click there.

For both, the results appear in a box at the bottom-right of the Cadmus page. The box fades after 10 seconds if
everything worked and stays up if anything failed. On a page that isn't Cadmus, the icon shows a red **!** instead.

## Install: Chrome (or Edge)
1. Go to `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and pick `exam-tools` (Exam Tools) and/or `exam-setup` (Exam Setup).
3. Pin the extensions. On the Cadmus page, click an icon, then **Apply to this page**.

## Install: Firefox (128 or newer)
- **Temporary:** go to `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on…**, and pick the
  `manifest.json` in either folder. Firefox removes it when it restarts.
- **Permanent:** zip the *contents* of the folder and upload it as an **unlisted** add-on at
  https://addons.mozilla.org/developers/ to get it signed, then install the signed `.xpi`.
- If Firefox asks for permission to access cadmus.io, allow it.

## Bookmarklets
Open `bookmarklet/install.html` and drag the buttons onto your bookmarks bar. Each version has two bookmarklets:
- **Settings panel:** opens a panel where you can change and save your options and click Apply.
- **⚡ One-click:** applies the options last saved in that version's panel (or the defaults) straight away.

If you can't drag, make a bookmark and paste the contents of the matching `.txt` file from `bookmarklet/` as its URL.
Bookmarklet settings are saved separately from the extension's settings.

## Editing
The shared code lives in `exam-tools/`: `cadmus-actions.js` (page automation), `form.js`, `runner.js`,
`background.js` (shortcut and one-click), and `popup.*` / `options.html`.
Each version's options and defaults are in its own `config.js`. After any change, run:
```
node build-bookmarklet.js
```
This copies the shared files into `exam-setup/` and rebuilds both bookmarklets. Don't edit the copies in `exam-setup/`.

## If something stops working
Cadmus may change its page. The script finds elements by their visible labels, so a ✗ result names the step that
failed and why.

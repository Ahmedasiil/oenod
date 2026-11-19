// OENOD desktop app (Windows and Mac). Opens the OENOD web app in a locked-down window.
// No Node.js access is given to web content, other sites open in the normal browser, and
// only the configured OENOD domain can load inside the app.
// OENOD Remote (remote.js) lets someone help on this computer, only after the person here presses Allow.
const { app, BrowserWindow, shell, Menu, session, dialog, net, systemPreferences, desktopCapturer } = require('electron');
const remote = require('./remote');
const path = require('path');
const fs = require('fs');

const cfgPath = [path.join(__dirname, 'oenod.app.json'), path.join(__dirname, '..', 'oenod.app.json')].find((p) => fs.existsSync(p));
const CFG = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const HOME = new URL(CFG.url);
const allowed = (u) => { try { const x = new URL(u); return x.protocol === 'https:' && (x.host === HOME.host || (CFG.allowedHosts || []).includes(x.host)); } catch { return false; } };

if (!app.requestSingleInstanceLock()) app.quit();
let win;

// rd2: oenod://remote-help?h=<one-time ticket> moves a browser screen share into this app (Give full control).
// Only this one link shape is accepted; the ticket is checked by oenod.com and the person still presses Allow.
if (process.defaultApp && process.argv.length >= 2) app.setAsDefaultProtocolClient('oenod', process.execPath, [path.resolve(process.argv[1])]);
else app.setAsDefaultProtocolClient('oenod');
let pendingLink = null;
function onLink(url) {
  let u; try { u = new URL(String(url || '')); } catch { return; }
  if (u.protocol !== 'oenod:' || (u.hostname || u.pathname.replace(/^\/+/, '').split('/')[0]) !== 'remote-help') return;
  const h = u.searchParams.get('h') || '';
  if (!win || win.isDestroyed() || !app.isReady()) { pendingLink = url; return; }
  win.loadURL(new URL('#/remote-help', HOME).href);
  if (win.isMinimized()) win.restore(); win.show(); win.focus();
  if (/^[a-f0-9]{32}$/.test(h)) remote.handoff(h);
}
const linkIn = (argv) => (argv || []).find((a) => typeof a === 'string' && a.startsWith('oenod://'));
app.on('open-url', (e, url) => { e.preventDefault(); onLink(url); }); // Mac
pendingLink = linkIn(process.argv) || null; // Windows and Linux, first start

function create() {
  win = new BrowserWindow({
    width: 1360, height: 860, minWidth: 380, minHeight: 600, show: false, title: CFG.appName,
    backgroundColor: '#0A0B10', icon: path.join(__dirname, 'build', 'icon.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, spellcheck: true, preload: path.join(__dirname, 'preload.js') },
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (allowed(url)) return { action: 'allow' }; // print windows, receipts, badges
    if (/^(https?|mailto|tel|sms):/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => { if (!allowed(url)) { e.preventDefault(); if (/^https?:/i.test(url)) shell.openExternal(url); } });
  win.webContents.on('did-fail-load', (e, code, desc, url, isMain) => { if (isMain && code !== -3) win.loadFile(path.join(__dirname, 'offline.html')); });
  win.loadURL(HOME.href);
}


// du1: tells the person when a newer OENOD desktop app is on the Download page.
// Reads oenod.com/api/public/apps (the same list the Download page uses) and opens the installer in the browser.
const newer = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
let askedFor = '';
async function checkUpdate() {
  try {
    const r = await net.fetch(new URL('/api/public/apps', HOME).href, { headers: { Accept: 'application/json' } });
    if (!r.ok) return;
    const j = await r.json();
    const key = process.platform === 'darwin' ? 'mac' : 'windows';
    let link = typeof j[key] === 'string' ? j[key] : '';
    const m = /(\d+\.\d+\.\d+)\.(exe|dmg)(\?|$)/i.exec(link);
    if (!m) return;
    let v = m[1];
    if (process.platform === 'linux') link = '/downloads/OENOD-' + v + '.AppImage';
    if (!newer(v, app.getVersion()) || askedFor === v || !win || win.isDestroyed()) return;
    askedFor = v;
    const url = new URL(link, HOME);
    if (!allowed(url.href)) return;
    const { response } = await dialog.showMessageBox(win, {
      type: 'info', buttons: ['Download now', 'Later'], defaultId: 0, cancelId: 1, title: 'OENOD update',
      message: 'A new OENOD app is ready (' + v + ')',
      detail: 'You have ' + app.getVersion() + '. Download the new version, open it and install it over this one. Your sign-in and data stay the same.',
    });
    if (response === 0) shell.openExternal(url.href);
  } catch { /* offline or site busy: try again later */ }
}

// dsk1: ask the computer for camera and microphone access for OENOD (Mac shows its own Allow box once).
// When the switch is off in the privacy settings, explain it and open the right settings page.
let toldOff = '';
async function osMediaAccess(kinds) {
  if (process.platform !== 'darwin' && process.platform !== 'win32') return;
  const off = [];
  for (const k of [...new Set(kinds)]) {
    let st = 'granted';
    try { st = systemPreferences.getMediaAccessStatus(k); } catch { st = 'granted'; }
    if (process.platform === 'darwin' && st === 'not-determined') { try { if (await systemPreferences.askForMediaAccess(k)) st = 'granted'; else st = 'denied'; } catch { st = 'granted'; } }
    if (st === 'denied' || st === 'restricted') off.push(k);
  }
  if (!off.length || toldOff === off.join() || !win || win.isDestroyed()) return;
  toldOff = off.join();
  const what = off.includes('microphone') && off.includes('camera') ? 'microphone and camera' : off[0];
  const mac = process.platform === 'darwin';
  const { response } = await dialog.showMessageBox(win, {
    type: 'warning', buttons: ['Open settings', 'Not now'], defaultId: 0, cancelId: 1, title: 'OENOD',
    message: 'Turn on the ' + what + ' for OENOD',
    detail: mac ? 'Your Mac is blocking the ' + what + ' for the OENOD app, so others cannot hear or see you. In System Settings, Privacy & Security, turn on OENOD, then quit OENOD (Cmd+Q) and open it again.'
      : 'Windows is blocking the ' + what + ' for desktop apps, so others cannot hear or see you. In Settings, Privacy & security, turn on access and "Let desktop apps access your ' + off[0] + '", then open OENOD again.',
  });
  if (response !== 0) return;
  const pane = off[0] === 'microphone' ? 'Microphone' : 'Camera';
  shell.openExternal(mac ? 'x-apple.systempreferences:com.apple.preference.security?Privacy_' + pane : 'ms-settings:privacy-' + pane.toLowerCase());
}

// dsk1: Share screen in a call. The Mac (macOS 15+) shows its own picker; elsewhere OENOD lists the screens and windows.
async function pickScreen(req, cb) {
  try {
    if (!allowed(req.frame && req.frame.url ? req.frame.url : (win && !win.isDestroyed() ? win.webContents.getURL() : ''))) return cb({});
    const list = await desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 0, height: 0 } });
    const items = list.filter((x) => !/^OENOD$/.test(x.name) || x.id.startsWith('screen')).slice(0, 9);
    if (!items.length) return cb({});
    if (items.length === 1) return cb({ video: items[0] });
    const names = items.map((x, i) => (x.id.startsWith('screen') ? (items.filter((y) => y.id.startsWith('screen')).length > 1 ? 'Screen ' + (i + 1) : 'Whole screen') : x.name.slice(0, 40)));
    const { response } = await dialog.showMessageBox(win, { type: 'question', title: 'Share your screen', message: 'What do you want to share?', buttons: [...names, 'Cancel'], cancelId: names.length, defaultId: 0, noLink: true });
    if (response >= items.length) return cb({});
    cb({ video: items[response] });
  } catch { cb({}); }
}

app.whenReady().then(() => {
  // Only camera (kiosk QR scan), location (clock-in geofence), notifications and clipboard are allowed, and only for OENOD.
  // dsk1: video calls also need full screen and screen sharing. Before a call, the Mac (and Windows) privacy switch for this app is
  // checked, so the microphone is never silently off: the person sees why and gets a button to the right settings page.
  const PERMS = ['media', 'geolocation', 'notifications', 'clipboard-sanitized-write', 'fullscreen', 'display-capture', 'speaker-selection'];
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb, details) => {
    if (!allowed(wc.getURL()) || !PERMS.includes(perm)) return cb(false);
    if (perm !== 'media') return cb(true);
    const kinds = (details && details.mediaTypes && details.mediaTypes.length ? details.mediaTypes : ['audio', 'video']).map((k) => (k === 'audio' ? 'microphone' : 'camera'));
    osMediaAccess(kinds).then(() => cb(true), () => cb(true));
  });
  session.defaultSession.setDisplayMediaRequestHandler((req, cb) => pickScreen(req, cb), { useSystemPicker: true });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    { label: 'File', submenu: [{ label: 'Home', accelerator: 'CmdOrCtrl+Shift+H', click: () => win.loadURL(HOME.href) }, { role: 'reload' }, { type: 'separator' }, process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' }] },
    { role: 'editMenu' },
    { label: 'View', submenu: [{ role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }] },
    { role: 'windowMenu' },
    { role: 'help', submenu: [{ label: 'OENOD website', click: () => shell.openExternal(HOME.origin + '/#/welcome') }] },
  ]));
  create();
  remote.init({ home: HOME, isMain: (wc) => !!win && !win.isDestroyed() && wc === win.webContents });
  if (pendingLink) { const l = pendingLink; pendingLink = null; win.webContents.once('did-finish-load', () => onLink(l)); }
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) create(); });
  setTimeout(checkUpdate, 15000); setInterval(checkUpdate, 6 * 3600 * 1000);
});
app.on('second-instance', (e, argv) => { const l = linkIn(argv); if (l) return onLink(l); if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
// Never allow web content to attach webviews.
app.on('web-contents-created', (_, wc) => wc.on('will-attach-webview', (e) => e.preventDefault()));

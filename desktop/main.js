// OENOD desktop app (Windows and Mac). Opens the OENOD web app in a locked-down window.
// No Node.js access is given to web content, other sites open in the normal browser, and
// only the configured OENOD domain can load inside the app.
const { app, BrowserWindow, shell, Menu, session } = require('electron');
const path = require('path');
const fs = require('fs');

const cfgPath = [path.join(__dirname, 'oenod.app.json'), path.join(__dirname, '..', 'oenod.app.json')].find((p) => fs.existsSync(p));
const CFG = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const HOME = new URL(CFG.url);
const allowed = (u) => { try { const x = new URL(u); return x.protocol === 'https:' && (x.host === HOME.host || (CFG.allowedHosts || []).includes(x.host)); } catch { return false; } };

if (!app.requestSingleInstanceLock()) app.quit();
let win;

function create() {
  win = new BrowserWindow({
    width: 1360, height: 860, minWidth: 380, minHeight: 600, show: false, title: CFG.appName,
    backgroundColor: '#0B1B3F', icon: path.join(__dirname, 'build', 'icon.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, spellcheck: true },
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

app.whenReady().then(() => {
  // Only camera (kiosk QR scan), location (clock-in geofence), notifications and clipboard are allowed, and only for OENOD.
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(allowed(wc.getURL()) && ['media', 'geolocation', 'notifications', 'clipboard-sanitized-write'].includes(perm)));
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    { label: 'File', submenu: [{ label: 'Home', accelerator: 'CmdOrCtrl+Shift+H', click: () => win.loadURL(HOME.href) }, { role: 'reload' }, { type: 'separator' }, process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' }] },
    { role: 'editMenu' },
    { label: 'View', submenu: [{ role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }] },
    { role: 'windowMenu' },
    { role: 'help', submenu: [{ label: 'OENOD website', click: () => shell.openExternal(HOME.origin + '/#/welcome') }] },
  ]));
  create();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) create(); });
});
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
// Never allow web content to attach webviews.
app.on('web-contents-created', (_, wc) => wc.on('will-attach-webview', (e) => e.preventDefault()));

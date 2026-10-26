// OENOD desktop: a secure window onto your OENOD server, with a native maintenance and update check.
const { app, BrowserWindow, Menu, dialog, nativeTheme, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const pkg = require('../package.json');

const VERSION = app.getVersion();
const APP_URL = (process.env.OENOD_URL || readConfig().appUrl || pkg.oenod.appUrl).replace(/\/$/, '');
const ORIGIN = new URL(APP_URL).origin;
const UA_TAG = `OENOD-Desktop/${VERSION}`;

/** Optional config.json in the user data folder lets an admin point the app at another server without rebuilding. */
function readConfig() {
  try { return JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'config.json'), 'utf8')); } catch { return {}; }
}

function older(a, b) {
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d < 0; }
  return false;
}

let win;

if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

function createWindow() {
  nativeTheme.themeSource = 'light';
  win = new BrowserWindow({
    width: 1360, height: 860, minWidth: 380, minHeight: 600,
    title: 'OENOD', backgroundColor: '#F5F7FC', show: false,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: true },
  });
  win.webContents.setUserAgent(`${win.webContents.getUserAgent()} ${UA_TAG}`);
  win.once('ready-to-show', () => win.show());

  // Stay on the OENOD server. Anything else (help links, websites, mailto) opens in the person's browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(ORIGIN)) return { action: 'allow' };
    if (/^(https?|mailto|tel):/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(ORIGIN)) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); }
  });
  win.webContents.on('did-fail-load', (_e, code, _desc, url, isMain) => {
    if (isMain && code !== -3) win.loadFile(path.join(__dirname, 'offline.html'), { query: { url: APP_URL } });
  });

  checkStatus().then((blocked) => { if (!blocked) win.loadURL(`${APP_URL}/app`); });
}

/** Before loading, ask the server whether this version is still supported. Maintenance itself is shown by the server's own page. */
async function checkStatus() {
  try {
    const res = await fetch(`${APP_URL}/api/platform/status`, { headers: { 'X-Oenod-Client': `desktop/${VERSION}` } });
    const s = await res.json();
    const d = s.surfaces && s.surfaces.desktop;
    if (d && d.minVersion && older(VERSION, d.minVersion)) {
      win.loadFile(path.join(__dirname, 'update.html'), { query: { url: d.updateUrl || '', latest: d.latestVersion || d.minVersion } });
      return true;
    }
  } catch { /* offline: did-fail-load shows the offline page */ }
  return false;
}

function menu() {
  const mac = process.platform === 'darwin';
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(mac ? [{ role: 'appMenu' }] : []),
    { label: 'File', submenu: [{ label: 'Home', accelerator: 'CmdOrCtrl+Shift+H', click: () => win && win.loadURL(`${APP_URL}/app`) }, { type: 'separator' }, mac ? { role: 'close' } : { role: 'quit' }] },
    { role: 'editMenu' },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'forceReload' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }, ...(app.isPackaged ? [] : [{ role: 'toggleDevTools' }])] },
    { label: 'Go', submenu: [
      { label: 'Back', accelerator: 'Alt+Left', click: () => win && win.webContents.navigationHistory.canGoBack() && win.webContents.navigationHistory.goBack() },
      { label: 'Forward', accelerator: 'Alt+Right', click: () => win && win.webContents.navigationHistory.canGoForward() && win.webContents.navigationHistory.goForward() },
    ] },
    { role: 'windowMenu' },
    { role: 'help', submenu: [
      { label: 'Open OENOD in your browser', click: () => shell.openExternal(`${APP_URL}/app`) },
      { label: 'Platform status', click: () => shell.openExternal(`${APP_URL}/status`) },
      { label: `About OENOD ${VERSION}`, click: () => dialog.showMessageBox({ message: `OENOD ${VERSION}`, detail: `Connected to ${ORIGIN}` }) },
    ] },
  ]));
}

app.whenReady().then(() => {
  // Only the OENOD server may ask for location (clock in) and notifications. Everything else is refused.
  session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => {
    const ok = wc.getURL().startsWith(ORIGIN) && ['geolocation', 'notifications', 'clipboard-sanitized-write', 'fullscreen'].includes(permission);
    cb(ok);
  });
  session.defaultSession.webRequest.onBeforeSendHeaders({ urls: [`${ORIGIN}/*`] }, (d, cb) => {
    d.requestHeaders['X-Oenod-Client'] = `desktop/${VERSION}`;
    cb({ requestHeaders: d.requestHeaders });
  });
  menu();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('web-contents-created', (_e, wc) => wc.on('will-attach-webview', (ev) => ev.preventDefault()));

// OENOD Remote agent (rd1), main process.
// Lets a helper see this computer and, only if the person here allows it, use the mouse and keyboard.
// Rules kept here, not in web pages:
//  - Nothing is shared until the person here presses Allow in a pop-up that the helper can not see or click.
//  - The screen and input travel computer to computer over WebRTC (DTLS). oenod.com only passes the first hello.
//  - Input is used only from the one helper who has control, only while control is allowed and not paused.
//  - A red frame and a Stop bar stay on screen. Ctrl+Alt+Esc stops everything at once.
//  - Files are saved to Downloads/OENOD Remote, checked against their SHA-256 and never opened.
//  - The computer's secret is kept with the system's key store (safeStorage) and never given to any web page.
const { BrowserWindow, ipcMain, session, desktopCapturer, screen, clipboard, globalShortcut, systemPreferences, safeStorage, app, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');

const WORDS = ['river', 'oak', 'mint', 'cedar', 'harbor', 'maple', 'stone', 'cloud', 'amber', 'falcon', 'lake', 'pine', 'coral', 'birch', 'comet', 'delta',
  'ember', 'fern', 'glacier', 'hazel', 'iris', 'jade', 'kite', 'lemon', 'meadow', 'north', 'olive', 'pearl', 'quartz', 'robin', 'sage', 'tulip',
  'umber', 'violet', 'willow', 'yarrow', 'zephyr', 'aspen', 'bloom', 'canyon', 'dune', 'echo', 'frost', 'grove', 'heron', 'island', 'juniper', 'koala',
  'lotus', 'marble', 'nova', 'orchid', 'prairie', 'quill', 'ridge', 'summit', 'tiger', 'urchin', 'valley', 'walnut', 'yukon', 'zinnia', 'beacon', 'copper'];
const MAX_FILE = 200 * 1024 * 1024;
const RIGHT = { control: 'Mouse and keyboard', clip: 'Copy and paste', files: 'Files' };

let HOME, isMain;
const S = {
  cred: null, id: null, code: null, codeExp: null, locked: null, companyDevice: false,
  helpPages: new Set(), newcode: false, started: false, polling: false, wake: null,
  ans: [], stop: [], out: [], ev: [], fpOut: {}, after: 0,
  live: [], fps: {}, asked: new Set(), consents: 0, paused: false,
  disp: {}, // token -> { display, sourceId, index }
  held: { keys: new Set(), buttons: new Set() },
  files: {}, // token|peer -> transfer
  fileTotal: {}, // token -> bytes announced this session
  hostWin: null, barWin: null, overlays: {}, rpcN: 0, rpc: {}, lastOpen: 0,
};

// ---------- input library (mouse and keyboard) ----------
let nut;
function lib() {
  if (nut !== undefined) return nut;
  nut = null;
  if (process.platform === 'linux' && (process.env.XDG_SESSION_TYPE === 'wayland' || !process.env.DISPLAY)) return nut; // Wayland blocks input from apps
  try { nut = require('@nut-tree-fork/libnut-' + process.platform); nut.setMouseDelay?.(0); nut.setKeyboardDelay?.(0); } catch { nut = null; }
  return nut;
}
const canControl = () => !!lib();
const KEYS = {
  Backspace: 'backspace', Tab: 'tab', Enter: 'enter', NumpadEnter: 'enter', Escape: 'escape', Space: 'space', Delete: 'delete', Insert: 'insert',
  Home: 'home', End: 'end', PageUp: 'pageup', PageDown: 'pagedown', ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  ShiftLeft: 'shift', ShiftRight: 'right_shift', ControlLeft: 'control', ControlRight: 'right_control', AltLeft: 'alt', AltRight: 'right_alt',
  MetaLeft: process.platform === 'darwin' ? 'cmd' : 'win', MetaRight: process.platform === 'darwin' ? 'right_cmd' : 'right_win', CapsLock: 'caps_lock', ContextMenu: 'menu',
  Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backquote: '`',
  NumpadDecimal: 'numpad_decimal', NumpadAdd: 'add', NumpadSubtract: 'subtract', NumpadMultiply: 'multiply', NumpadDivide: 'divide', PrintScreen: 'printscreen',
};
function keyName(code) {
  if (typeof code !== 'string' || code.length > 24) return null;
  if (KEYS[code]) return KEYS[code];
  let m = /^Key([A-Z])$/.exec(code); if (m) return m[1].toLowerCase();
  m = /^Digit([0-9])$/.exec(code); if (m) return m[1];
  m = /^Numpad([0-9])$/.exec(code); if (m) return 'numpad_' + m[1];
  m = /^F([1-9]|1[0-9]|2[0-4])$/.exec(code); if (m) return 'f' + m[1];
  return null;
}
const BTN = { 0: 'left', 1: 'middle', 2: 'right' };
function releaseAll() {
  const n = lib(); if (!n) return;
  for (const k of S.held.keys) { try { n.keyToggle(k, 'up'); } catch { /* */ } }
  for (const b of S.held.buttons) { try { n.mouseToggle('up', b); } catch { /* */ } }
  S.held.keys.clear(); S.held.buttons.clear();
}
function toScreen(d, nx, ny) {
  const b = d.bounds;
  const x = b.x + Math.min(1, Math.max(0, nx)) * (b.width - 1), y = b.y + Math.min(1, Math.max(0, ny)) * (b.height - 1);
  if (process.platform === 'win32') return screen.dipToScreenPoint({ x, y });
  if (process.platform === 'linux') return { x: Math.round(x * d.scaleFactor), y: Math.round(y * d.scaleFactor) };
  return { x: Math.round(x), y: Math.round(y) };
}

// ---------- helpers ----------
const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, n);
function safety(a, b) {
  const x = [a, b].sort();
  const h = crypto.createHash('sha256').update(x[0] + '|' + x[1]).digest();
  return `${WORDS[h[0] & 63]} · ${WORDS[h[1] & 63]} · ${WORDS[h[2] & 63]} · ${String(h[3] % 100).padStart(2, '0')}`;
}
const credFile = () => path.join(app.getPath('userData'), 'remote.json');
function loadCred() {
  try {
    const j = JSON.parse(fs.readFileSync(credFile(), 'utf8'));
    if (j.enc && safeStorage.isEncryptionAvailable()) return { id: j.id, secret: safeStorage.decryptString(Buffer.from(j.enc, 'base64')) };
  } catch { /* none yet */ }
  return null;
}
function saveCred(c) {
  S.cred = c;
  try {
    if (!c) { fs.rmSync(credFile(), { force: true }); return; }
    // Without the system key store the secret stays in memory only, and this computer gets a new ID next time.
    if (safeStorage.isEncryptionAvailable()) fs.writeFileSync(credFile(), JSON.stringify({ id: c.id, enc: safeStorage.encryptString(c.secret).toString('base64') }), { mode: 0o600 });
  } catch { /* */ }
}
async function api(p, body) {
  const r = await session.defaultSession.fetch(HOME.origin + '/api' + p, {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body),
  });
  let j = {}; try { j = await r.json(); } catch { /* */ }
  if (!r.ok) { const e = new Error(j.error || 'OENOD could not be reached'); e.status = r.status; throw e; }
  return j;
}
const osName = () => (process.platform === 'win32' ? 'Windows ' : process.platform === 'darwin' ? 'macOS ' : 'Linux ') + os.release();
async function open() {
  S.lastOpen = Date.now();
  const r = await api('/public/rd/open', { kind: 'app', name: clean(os.hostname(), 80), os: osName(), ver: app.getVersion(), control: canControl(), resume: S.cred });
  if (r.secret) saveCred({ id: r.id, secret: r.secret });
  S.id = r.id; S.companyDevice = !!r.company_device;
}

// ---------- local windows (all ours, file://, strict CSP, no Node) ----------
const LOCAL = (f) => path.join(__dirname, 'remote', f);
function localWin(opts, file) {
  const w = new BrowserWindow({
    show: false, frame: false, resizable: false, minimizable: false, maximizable: false, fullscreenable: false, skipTaskbar: true, backgroundColor: '#00000000',
    ...opts,
    webPreferences: { preload: LOCAL('local-preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, partition: 'rd-local', devTools: !app.isPackaged, ...(opts.webPreferences || {}) },
  });
  w.webContents.on('will-navigate', (e) => e.preventDefault());
  w.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  w.loadFile(LOCAL(file));
  return w;
}

function hostWin() {
  if (S.hostWin && !S.hostWin.isDestroyed()) return S.hostWin;
  const w = localWin({ width: 200, height: 100, transparent: false, webPreferences: { partition: 'rd-host', backgroundThrottling: false } }, 'host.html');
  S.hostWin = w;
  w.on('closed', () => { S.hostWin = null; });
  return w;
}
function rpc(op, args, ms = 20000) {
  const w = hostWin();
  const id = ++S.rpcN;
  return new Promise((res, rej) => {
    const go = () => w.webContents.send('rd:h:cmd', { id, op, ...args });
    S.rpc[id] = { res, rej, t: setTimeout(() => { delete S.rpc[id]; rej(new Error('timeout ' + op)); }, ms) };
    if (w.webContents.isLoading()) w.webContents.once('did-finish-load', go); else go();
  });
}

// ---------- the Allow pop-up ----------
function consent(a, sources) {
  return new Promise((resolve) => {
    S.consents++; releaseAll();
    const d = screen.getPrimaryDisplay().workArea;
    const W = 460, H = Math.min(d.height - 40, a.kind === 'connect' ? 720 : a.kind === 'rights' ? 480 : 400);
    const w = localWin({ width: W, height: H, x: Math.round(d.x + (d.width - W) / 2), y: Math.round(d.y + (d.height - H) / 2), alwaysOnTop: true, focusable: true, backgroundColor: '#ffffff' }, 'consent.html');
    w.setAlwaysOnTop(true, 'screen-saver');
    w.setContentProtection(true); // the helper can not see or click this pop-up
    if (process.platform === 'darwin') w.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    let done = false;
    const finish = (x) => {
      if (done) return; done = true; S.consents = Math.max(0, S.consents - 1);
      ipcMain.removeListener('rd:c:answer', onAns);
      if (!w.isDestroyed()) w.close();
      resolve(x);
    };
    const onAns = (e, x) => { if (e.sender !== w.webContents) return; finish(x && typeof x === 'object' ? x : { allow: false }); };
    ipcMain.on('rd:c:answer', onAns);
    w.on('closed', () => finish({ allow: false }));
    w.webContents.once('did-finish-load', () => {
      w.webContents.send('rd:c:data', {
        kind: a.kind, name: clean(a.name, 80), company: clean(a.company, 80), hq: !!a.hq, safety: a.safety, rights: (a.rights || []).filter((r) => RIGHT[r]),
        control: canControl(), limitMax: a.limit_max || 120, age: Math.min(25, a.age || 0),
        screens: sources.map((s, i) => ({ i, name: s.name || 'Screen ' + (i + 1), thumb: s.thumbnail && !s.thumbnail.isEmpty() ? s.thumbnail.toDataURL() : '' })),
      });
      w.show(); w.focus();
    });
    setTimeout(() => finish({ allow: false, why: 'timeout' }), 31000);
  });
}
async function screens(thumbs) {
  const src = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: thumbs ? { width: 320, height: 180 } : { width: 0, height: 0 } });
  const ds = screen.getAllDisplays();
  return src.map((s, i) => ({ ...s, name: ds.length > 1 ? 'Screen ' + (i + 1) : 'Your screen', display: ds.find((d) => String(d.id) === String(s.display_id)) || ds[i] || screen.getPrimaryDisplay() }));
}
async function macAccess(rights) {
  if (process.platform !== 'darwin') return;
  if (systemPreferences.getMediaAccessStatus('screen') !== 'granted') await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1, height: 1 } }).catch(() => {});
  if (rights.includes('control') && !systemPreferences.isTrustedAccessibilityClient(false)) systemPreferences.isTrustedAccessibilityClient(true);
}

async function handleAsk(a) {
  const key = a.s + '|' + a.kind + '|' + a.p + '|' + (a.rights || []).join(',');
  if (S.asked.has(key)) return; S.asked.add(key);
  try {
    const fp = S.fps[a.s] || (S.fps[a.s] = await rpc('sess', { s: a.s }));
    S.fpOut[a.s] = fp;
    if (a.kind === 'rights') {
      const live = S.live.find((l) => l.s === a.s);
      const who = live?.peers.find((p) => p.id === a.p);
      const x = await consent({ ...a, safety: who?.fp ? safety(fp, who.fp) : '' }, []);
      S.ans.push({ s: a.s, kind: 'rights', p: a.p, allow: !!x.allow, rights: Array.isArray(x.rights) ? x.rights.filter((r) => RIGHT[r]) : [] });
      if (x.allow) await macAccess(x.rights || []);
    } else {
      const src = a.kind === 'connect' ? await screens(true) : [];
      const x = await consent({ ...a, safety: safety(fp, a.fp) }, src);
      if (a.kind === 'connect' && x.allow) {
        const pick = src[Math.max(0, Math.min(src.length - 1, +x.screen || 0))];
        if (!pick) { S.ans.push({ s: a.s, kind: 'connect', p: a.p, allow: false }); return; }
        S.disp[a.s] = { sourceId: pick.id, display: pick.display, index: src.indexOf(pick), count: src.length };
        await macAccess(x.rights || []);
      }
      S.ans.push({ s: a.s, kind: a.kind, p: a.p, allow: !!x.allow, rights: Array.isArray(x.rights) ? x.rights.filter((r) => RIGHT[r]) : [], limit: +x.limit || 30 });
    }
  } catch { S.ans.push({ s: a.s, kind: a.kind, p: a.p, allow: false }); }
  kick();
}

// ---------- the bar, red frame and drawings ----------
function bar() {
  if (S.barWin && !S.barWin.isDestroyed()) return S.barWin;
  const d = screen.getPrimaryDisplay().workArea;
  const W = 560, H = 64;
  const w = localWin({ width: W, height: H, x: Math.round(d.x + (d.width - W) / 2), y: d.y + 12, alwaysOnTop: true, focusable: true, backgroundColor: '#000C58', resizable: false }, 'bar.html');
  w.setAlwaysOnTop(true, 'screen-saver');
  w.setContentProtection(true);
  if (process.platform === 'darwin') w.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  w.once('ready-to-show', () => w.showInactive());
  w.on('closed', () => { S.barWin = null; });
  S.barWin = w;
  return w;
}
function overlay(tok) {
  const d = S.disp[tok]?.display; if (!d) return null;
  const k = String(d.id);
  if (S.overlays[k] && !S.overlays[k].isDestroyed()) return S.overlays[k];
  const w = localWin({ ...d.bounds, transparent: true, focusable: false, alwaysOnTop: true, hasShadow: false, enableLargerThanScreen: true }, 'overlay.html');
  w.setIgnoreMouseEvents(true);
  w.setAlwaysOnTop(true, 'screen-saver');
  w.setContentProtection(true); // the helper sees their own drawing, not a copy of it
  if (process.platform === 'darwin') w.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  w.once('ready-to-show', () => w.showInactive());
  w.on('closed', () => { delete S.overlays[k]; });
  S.overlays[k] = w;
  return w;
}
function paintLocal() {
  const live = S.live;
  if (!live.length) {
    if (S.barWin && !S.barWin.isDestroyed()) S.barWin.close();
    Object.values(S.overlays).forEach((w) => !w.isDestroyed() && w.close());
    if (globalShortcut.isRegistered('CommandOrControl+Alt+Escape')) globalShortcut.unregister('CommandOrControl+Alt+Escape');
    S.paused = false; releaseAll();
    return;
  }
  if (!globalShortcut.isRegistered('CommandOrControl+Alt+Escape')) globalShortcut.register('CommandOrControl+Alt+Escape', () => stopAll('shortcut'));
  const wanted = new Set();
  live.forEach((l) => { const o = overlay(l.s); if (o) wanted.add(String(S.disp[l.s].display.id)); });
  Object.entries(S.overlays).forEach(([k, w]) => { if (!wanted.has(k) && !w.isDestroyed()) w.close(); });
  const w = bar();
  const send = () => w.webContents.send('rd:b:state', {
    sessions: live.map((l) => ({ s: l.s, names: l.peers.map((p) => p.name), rights: l.rights, ends: l.ends_at, controller: l.peers.find((p) => p.id === l.controller)?.name || '' })),
    paused: S.paused, control: canControl(), now: Math.floor(Date.now() / 1000), access: process.platform === 'darwin' ? systemPreferences.isTrustedAccessibilityClient(false) : true,
  });
  if (w.webContents.isLoading()) w.webContents.once('did-finish-load', send); else send();
}
function stopAll(why) {
  releaseAll();
  for (const l of S.live) { S.stop.push(l.s); rpc('close', { s: l.s }).catch(() => {}); }
  S.live = []; paintLocal(); kick();
  if (why === 'shortcut') S.ev.length = 0;
}
function toPeers(s, m, p) { rpc('send', { s, p: p || 0, m }).catch(() => {}); }

// ---------- what helpers send over the secure channel ----------
function onCtl(s, p, m) {
  const l = S.live.find((x) => x.s === s);
  if (!l || !m || typeof m.t !== 'string' || !l.peers.some((x) => x.id === p)) return;
  const who = l.peers.find((x) => x.id === p)?.name || 'Helper';
  if (m.t === 'chat') { const text = clean(m.text, 500).trim(); if (text && S.barWin) S.barWin.webContents.send('rd:b:chat', { who, text }); return; }
  if (m.t === 'draw') {
    if (!Array.isArray(m.pts)) return;
    const pts = m.pts.slice(0, 400).filter((q) => Array.isArray(q) && q.length === 2 && q.every((v) => typeof v === 'number' && v >= 0 && v <= 1));
    const o = overlay(s); if (o && pts.length > 1) o.webContents.send('rd:o:draw', pts);
    return;
  }
  if (m.t === 'clip') {
    if (!l.rights.includes('clip') || typeof m.text !== 'string') return;
    clipboard.writeText(m.text.slice(0, 100000));
    S.ev.push({ s, e: 'clip.used', d: who + ' pasted to this computer' }); return;
  }
  if (m.t === 'clipget') {
    if (!l.rights.includes('clip')) return;
    toPeers(s, { t: 'clip', text: clipboard.readText().slice(0, 100000) }, p);
    S.ev.push({ s, e: 'clip.used', d: who + ' copied from this computer' }); return;
  }
  // Everything below moves the mouse or presses keys.
  if (!l.rights.includes('control') || l.controller !== p || S.paused || S.consents > 0) return;
  const n = lib(); const d = S.disp[s]; if (!n || !d) return;
  try {
    if (m.t === 'scr') {
      const i = +m.i;
      screens(false).then((src) => {
        const pick = src[i]; if (!pick || !S.live.some((x) => x.s === s)) return;
        S.disp[s] = { sourceId: pick.id, display: pick.display, index: i, count: src.length };
        rpc('switch', { s, sourceId: pick.id }).then(() => { toPeers(s, { t: 'scr', cur: i }); paintLocal(); }).catch(() => {});
        S.ev.push({ s, e: 'screen.changed', d: 'Screen ' + (i + 1) });
      });
      return;
    }
    if (m.t === 'mm' && typeof m.x === 'number' && typeof m.y === 'number') { const q = toScreen(d.display, m.x, m.y); n.moveMouse(q.x, q.y); }
    else if ((m.t === 'md' || m.t === 'mu') && BTN[m.b]) { n.mouseToggle(m.t === 'md' ? 'down' : 'up', BTN[m.b]); m.t === 'md' ? S.held.buttons.add(BTN[m.b]) : S.held.buttons.delete(BTN[m.b]); }
    else if (m.t === 'wh') {
      const f = process.platform === 'win32' ? 40 : process.platform === 'darwin' ? 4 : 1;
      const dx = Math.max(-20, Math.min(20, Math.round(+m.dx || 0))), dy = Math.max(-20, Math.min(20, Math.round(+m.dy || 0)));
      if (dx || dy) n.scrollMouse(dx * f, -dy * f);
    } else if (m.t === 'kd' || m.t === 'ku') {
      const k = keyName(m.c) || (typeof m.k === 'string' && /^[a-z0-9]$/i.test(m.k) ? m.k.toLowerCase() : null);
      if (!k) return;
      n.keyToggle(k, m.t === 'kd' ? 'down' : 'up');
      m.t === 'kd' ? S.held.keys.add(k) : S.held.keys.delete(k);
    } else if (m.t === 'kreset') releaseAll();
  } catch { /* the system refused one event: ignore it */ }
}

// ---------- files from a helper ----------
const DL = () => path.join(app.getPath('downloads'), 'OENOD Remote');
function safeName(n) {
  let x = path.basename(String(n || '')).normalize('NFC').replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, '_').replace(/^[.\s]+|[.\s]+$/g, '').slice(0, 180);
  if (!x || /^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i.test(x)) x = 'file' + (x ? '_' + x : '');
  return x;
}
function uniq(dir, name) {
  const ext = path.extname(name), base = name.slice(0, name.length - ext.length);
  for (let i = 0; i < 1000; i++) { const f = path.join(dir, i ? `${base} (${i})${ext}` : name); if (!fs.existsSync(f)) return f; }
  return path.join(dir, crypto.randomBytes(4).toString('hex') + '_' + name);
}
function markDownloaded(f) {
  try {
    if (process.platform === 'win32') fs.writeFileSync(f + ':Zone.Identifier', '[ZoneTransfer]\r\nZoneId=3\r\nHostUrl=about:internet\r\n');
    else if (process.platform === 'darwin') execFile('xattr', ['-w', 'com.apple.quarantine', '0081;' + Math.floor(Date.now() / 1000).toString(16) + ';OENOD;', f], () => {});
  } catch { /* */ }
}
function onFile(s, p, kind, data) {
  const l = S.live.find((x) => x.s === s);
  const k = s + '|' + p;
  const t = S.files[k];
  const fail = (why, name) => { if (S.files[k]) { try { S.files[k].fd && fs.closeSync(S.files[k].fd); fs.rmSync(S.files[k].tmp, { force: true }); } catch { /* */ } delete S.files[k]; } toPeers(s, { t: 'filed', name: clean(name || '', 180), ok: false, why }, p); };
  if (!l || !l.peers.some((x) => x.id === p)) return;
  if (kind === 'meta') {
    if (t) fail('another file started');
    if (!l.rights.includes('files')) return fail('files are not allowed', data?.name);
    const size = +data?.size;
    if (!Number.isFinite(size) || size < 0 || size > MAX_FILE) return fail('too big', data?.name);
    if ((S.fileTotal[s] || 0) + size > 4 * MAX_FILE) return fail('this session already received 800 MB', data?.name);
    S.fileTotal[s] = (S.fileTotal[s] || 0) + size;
    if (typeof data?.sha !== 'string' || !/^[0-9a-f]{64}$/.test(data.sha)) return fail('no check code', data?.name);
    fs.mkdirSync(DL(), { recursive: true });
    const tmp = path.join(DL(), '.' + crypto.randomBytes(8).toString('hex') + '.part');
    S.files[k] = { name: safeName(data.name), size, sha: data.sha, got: 0, hash: crypto.createHash('sha256'), tmp, fd: fs.openSync(tmp, 'wx', 0o600) };
  } else if (kind === 'chunk') {
    if (!t) return;
    const b = Buffer.from(data instanceof ArrayBuffer ? new Uint8Array(data) : data || []);
    t.got += b.length;
    if (t.got > t.size) return fail('more data than announced', t.name);
    fs.writeSync(t.fd, b); t.hash.update(b);
  } else if (kind === 'end') {
    if (!t) return;
    fs.closeSync(t.fd); t.fd = null;
    const sha = t.hash.digest('hex');
    if (t.got !== t.size || sha !== t.sha) return fail('the check code did not match', t.name);
    const final = uniq(DL(), t.name);
    fs.renameSync(t.tmp, final); markDownloaded(final);
    delete S.files[k];
    toPeers(s, { t: 'filed', name: path.basename(final), ok: true }, p);
    S.ev.push({ s, e: 'file.received', d: path.basename(final).slice(0, 120) + ' · ' + Math.round(t.size / 1024) + ' KB · sha256 ' + sha.slice(0, 16), b: t.size });
    if (S.barWin) S.barWin.webContents.send('rd:b:file', { name: path.basename(final) });
  }
}

// ---------- the loop: one small request to oenod.com, everything else computer to computer ----------
const mode = () => (S.helpPages.size ? 'help' : 'idle');
function kick() {
  if (S.polling) { S.again = true; return; }
  if (S.wake) clearTimeout(S.wake);
  S.wake = setTimeout(() => { S.wake = null; loop(); }, 350);
}
async function loop() {
  if (S.polling) return; S.polling = true;
  let delay = 30000;
  try {
    if (!S.cred || !S.id) await open();
    if (!S.cred) throw Object.assign(new Error('no key store'), { status: 0 });
    const body = { id: S.cred.id, secret: S.cred.secret, mode: mode(), newcode: S.newcode, ans: S.ans.splice(0), stop: S.stop.splice(0), out: S.out.splice(0, 200), fp: S.fpOut, ev: S.ev.splice(0, 20), after: S.after, screens: screen.getAllDisplays().length };
    S.newcode = false; S.fpOut = {};
    let r;
    try { r = await api('/public/rd/hsync', body); }
    catch (e) {
      if (e.status === 401) { saveCred(null); S.id = null; }
      else if (e.status !== 429) { S.ans.unshift(...body.ans); S.stop.unshift(...body.stop); S.ev.unshift(...body.ev); Object.assign(S.fpOut, body.fp); }
      throw e;
    }
    if (r.code) S.code = r.code;
    S.codeExp = r.code_exp; S.locked = r.locked; S.id = r.id || S.id;
    if (mode() === 'idle') S.code = null;
    for (const a of r.asks || []) handleAsk(a);
    const before = new Set(S.live.map((l) => l.s));
    S.live = (r.live || []).filter((l) => S.disp[l.s]).map((l) => ({ ...l, peers: (l.peers || []).map((p) => ({ ...p, id: +p.id })), controller: +l.controller || 0 }));
    for (const l of r.live || []) if (!S.disp[l.s]) S.stop.push(l.s); // live without a screen picked here: should not happen, stop it
    for (const l of S.live) {
      if (!S.fps[l.s]) S.fps[l.s] = await rpc('sess', { s: l.s });
      const d = S.disp[l.s];
      for (const p of l.peers) await rpc('peer', { s: l.s, p: { id: p.id, fp: p.fp, name: clean(p.name, 80) }, ice: r.ice || [], sourceId: d.sourceId, screens: Array.from({ length: d.count }, (_, i) => ({ name: 'Screen ' + (i + 1) })), cur: d.index, os: osName() });
      await rpc('peers', { s: l.s, ids: l.peers.map((p) => p.id) });
    }
    for (const x of r.sig || []) { S.after = Math.max(S.after, +x.id || 0); rpc('sig', { s: x.s, p: +x.p, k: x.k, d: x.d }).catch(() => {}); }
    const nowLive = new Set(S.live.map((l) => l.s));
    for (const tok of before) if (!nowLive.has(tok)) { rpc('close', { s: tok }).catch(() => {}); delete S.disp[tok]; delete S.fps[tok]; }
    for (const tok of Object.keys(S.fps)) if (!nowLive.has(tok) && !(r.asks || []).some((a) => a.s === tok) && !S.disp[tok]) delete S.fps[tok];
    if (!S.live.length && !(r.asks || []).length) S.asked.clear();
    paintLocal();
    delay = S.live.length || (r.asks || []).length || S.out.length || S.consents ? 800 : mode() === 'help' ? 1500 : S.companyDevice ? 20000 : 0;
  } catch (e) {
    if (process.env.RD_DEBUG) console.error('[rd]', e && e.stack || e);
    delay = e.status === 429 ? 600 : (S.live.length ? 2000 : 15000);
  } finally {
    S.polling = false;
    if (S.again) { S.again = false; delay = Math.min(delay || 350, 350); }
    // A computer that is not a company computer and is not showing its code does not keep asking oenod.com.
    if (delay) S.wake = setTimeout(() => { S.wake = null; loop(); }, delay);
  }
}
function ensureRunning() { if (!S.polling && !S.wake) loop(); }

// ---------- wiring ----------
function init(opts) {
  HOME = opts.home; isMain = opts.isMain;
  S.cred = loadCred();
  // The OENOD page in the main window (and only that page) may read this computer's ID and code.
  const fromHome = (e) => { try { return isMain(e.sender) && new URL(e.senderFrame.url).origin === HOME.origin; } catch { return false; } };
  ipcMain.handle('rd:status', (e) => {
    if (!fromHome(e)) return null;
    return { id: S.id, code: S.helpPages.size && !S.locked ? S.code : null, code_exp: S.codeExp, locked: S.locked, live: S.live.length, control: canControl() };
  });
  ipcMain.handle('rd:newcode', (e) => { if (!fromHome(e)) return false; S.newcode = true; kick(); return true; });
  ipcMain.handle('rd:help', async (e, on) => {
    if (!fromHome(e)) return false;
    const k = e.sender.id;
    if (on) {
      S.helpPages.add(k);
      // Join this computer to the company of the person signed in here (at most once a minute).
      if (Date.now() - S.lastOpen > 60000) { try { await open(); } catch { /* next loop */ } }
      kick();
    } else S.helpPages.delete(k);
    return true;
  });
  // From the hidden window that holds the secure links.
  ipcMain.on('rd:h:reply', (e, x) => { if (!S.hostWin || e.sender !== S.hostWin.webContents) return; const r = S.rpc[x?.id]; if (!r) return; clearTimeout(r.t); delete S.rpc[x.id]; x.err ? r.rej(new Error(x.err)) : r.res(x.res); });
  ipcMain.on('rd:h:out', (e, x) => { if (!S.hostWin || e.sender !== S.hostWin.webContents) return; if (S.out.length < 500) S.out.push({ s: String(x.s), p: +x.p, k: String(x.k), d: x.d }); kick(); });
  ipcMain.on('rd:h:ctl', (e, x) => { if (!S.hostWin || e.sender !== S.hostWin.webContents) return; onCtl(String(x.s), +x.p, x.m); });
  ipcMain.on('rd:h:file', (e, x) => { if (!S.hostWin || e.sender !== S.hostWin.webContents) return; try { onFile(String(x.s), +x.p, x.kind, x.data); } catch (err) { if (process.env.RD_DEBUG) console.error('[rd] file', err); } });
  ipcMain.on('rd:h:secfail', (e, x) => { if (!S.hostWin || e.sender !== S.hostWin.webContents) return; S.stop.push(String(x.s)); kick(); });
  // From the bar.
  ipcMain.on('rd:b:stop', (e) => { if (S.barWin && e.sender === S.barWin.webContents) stopAll('bar'); });
  ipcMain.on('rd:b:pause', (e, v) => {
    if (!S.barWin || e.sender !== S.barWin.webContents) return;
    S.paused = !!v; releaseAll();
    for (const l of S.live) { toPeers(l.s, { t: 'paused', v: S.paused }); S.ev.push({ s: l.s, e: S.paused ? 'control.paused' : 'control.resumed', d: S.paused ? 'Paused on this computer' : 'Given back' }); }
    paintLocal(); kick();
  });
  ipcMain.on('rd:b:chat', (e, text) => { if (!S.barWin || e.sender !== S.barWin.webContents) return; const t = clean(text, 500).trim(); if (t) S.live.forEach((l) => toPeers(l.s, { t: 'chat', text: t })); });
  ipcMain.on('rd:b:size', (e, h) => { if (!S.barWin || e.sender !== S.barWin.webContents) return; const b = S.barWin.getBounds(); S.barWin.setBounds({ ...b, height: Math.max(64, Math.min(420, +h || 64)) }); });
  ipcMain.on('rd:b:access', (e) => { if (S.barWin && e.sender === S.barWin.webContents && process.platform === 'darwin') shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'); });

  // The hidden window may capture the screen, and nothing else may.
  const hs = session.fromPartition('rd-host');
  const hostOk = (wc, perm) => ['display-capture', 'media'].includes(perm) && !!wc && !!S.hostWin && !S.hostWin.isDestroyed() && wc === S.hostWin.webContents && wc.getURL().startsWith('file://');
  hs.setPermissionRequestHandler((wc, perm, cb) => cb(hostOk(wc, perm)));
  hs.setPermissionCheckHandler((wc, perm) => hostOk(wc, perm));
  const ls = session.fromPartition('rd-local');
  ls.setPermissionRequestHandler((wc, perm, cb) => cb(false));
  [hs, ls].forEach((x) => x.webRequest.onBeforeRequest((d, cb) => cb({ cancel: !/^(file|data|devtools):/.test(d.url) })));
  app.on('will-quit', () => { releaseAll(); globalShortcut.unregisterAll(); });
  // A computer that used Remote before comes back online by itself (needed for company computers).
  if (S.cred) ensureRunning();
}
module.exports = { init, _test: { keyName, safeName, safety } };

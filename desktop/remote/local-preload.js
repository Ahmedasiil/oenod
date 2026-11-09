// Preload for OENOD Remote's own small windows (hidden link window, Allow pop-up, bar, red frame).
const { contextBridge, ipcRenderer } = require('electron');
const ok = (ch) => typeof ch === 'string' && /^rd:[hcbo]:[a-z]+$/.test(ch);
contextBridge.exposeInMainWorld('rdLocal', Object.freeze({
  on: (ch, fn) => { if (ok(ch)) ipcRenderer.on(ch, (_e, x) => fn(x)); },
  send: (ch, x) => { if (ok(ch)) ipcRenderer.send(ch, x); },
  platform: process.platform,
}));

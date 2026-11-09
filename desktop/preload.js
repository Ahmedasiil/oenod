// Main window preload. Gives the OENOD Remote page this computer's ID and one-time code.
// The main process answers only the OENOD page in the main window; the computer's secret never leaves the main process.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('oenodRemote', Object.freeze({
  version: 1,
  status: () => ipcRenderer.invoke('rd:status'),
  newCode: () => ipcRenderer.invoke('rd:newcode'),
  help: (on) => ipcRenderer.invoke('rd:help', !!on),
}));

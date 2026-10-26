// Nothing from Node is exposed to the page. The web app only learns that it runs in the desktop app.
const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('oenodDesktop', { isDesktop: true, platform: process.platform });

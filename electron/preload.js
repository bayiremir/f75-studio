const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aula', {
  minimize: () => ipcRenderer.send('win:minimize'),
  maximize: () => ipcRenderer.send('win:maximize'),
  close: () => ipcRenderer.send('win:close'),
  quit: () => ipcRenderer.send('app:quit'),
  setCloseToTray: (v) => ipcRenderer.send('settings:closeToTray', v),
  getAutostart: () => ipcRenderer.invoke('settings:autostart:get'),
  setAutostart: (v) => ipcRenderer.invoke('settings:autostart:set', v),
  info: () => ipcRenderer.invoke('app:info'),
  onKey: (cb) => {
    const h = (_e, k) => cb(k);
    ipcRenderer.on('key', h);
    return () => ipcRenderer.removeListener('key', h);
  },
  onMaximized: (cb) => {
    const h = (_e, v) => cb(v);
    ipcRenderer.on('win:maximized', h);
    return () => ipcRenderer.removeListener('win:maximized', h);
  },
  onBeforeQuit: (cb) => {
    ipcRenderer.on('app:before-quit', async () => {
      try { await cb(); } finally { ipcRenderer.send('app:quit-ready'); }
    });
  },
  onTrayToggle: (cb) => {
    const h = () => cb();
    ipcRenderer.on('tray:toggle', h);
    return () => ipcRenderer.removeListener('tray:toggle', h);
  },
});

const { app, BrowserWindow, ipcMain, session, Tray, Menu, nativeImage, desktopCapturer, shell } = require('electron');
const path = require('path');

const AULA_VENDORS = [0x3554, 0x258a];
const DEV_URL = process.env.AULA_DEV_URL;
const startHidden = process.argv.includes('--hidden');

let win = null;
let tray = null;
let quitting = false;
let closeToTray = true;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => showWindow());
}

// Effects must keep streaming while the window is hidden in the tray.
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

function iconPath() {
  return path.join(__dirname, '..', app.isPackaged ? 'dist' : 'public', 'icon.png');
}

function showWindow() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function createWindow() {
  win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1100,
    minHeight: 720,
    frame: false,
    show: false,
    backgroundColor: '#07080d',
    icon: iconPath(),
    title: 'AULA F75 Studio',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  const query = process.env.AULA_DEBUG ? { trace: '1' } : undefined;
  if (DEV_URL) win.loadURL(DEV_URL);
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), { query });

  win.once('ready-to-show', () => {
    if (!startHidden) win.show();
  });

  win.on('close', (e) => {
    if (!quitting && closeToTray) {
      e.preventDefault();
      win.hide();
    }
  });

  win.on('maximize', () => win.webContents.send('win:maximized', true));
  win.on('unmaximize', () => win.webContents.send('win:maximized', false));

  if (process.env.AULA_DEBUG) {
    const fs = require('fs');
    const logFile = path.join(app.getPath('userData'), 'debug.log');
    fs.writeFileSync(logFile, '');
    win.webContents.on('console-message', (_e, level, message) => {
      fs.appendFileSync(logFile, `${new Date().toISOString().slice(11, 23)} [${level}] ${message}\n`);
    });
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function setupHid() {
  const ses = session.defaultSession;
  const isAula = (d) => d && AULA_VENDORS.includes(d.vendorId);

  ses.setPermissionCheckHandler((_wc, permission) => {
    if (permission === 'hid' || permission === 'media') return true;
    return false;
  });
  ses.setDevicePermissionHandler((details) => details.deviceType === 'hid' && isAula(details.device));
  ses.on('select-hid-device', (event, details, callback) => {
    event.preventDefault();
    const dev = details.deviceList.find(isAula);
    callback(dev ? dev.deviceId : '');
  });

  // System audio (loopback) for the music-reactive effects.
  ses.setDisplayMediaRequestHandler((_req, callback) => {
    desktopCapturer
      .getSources({ types: ['screen'] })
      .then((sources) => callback({ video: sources[0], audio: 'loopback' }))
      .catch(() => callback({}));
  });
}

// Physical key -> layout key id used by the renderer.
const KEY_IDS = {
  Escape: 'esc', F1: 'f1', F2: 'f2', F3: 'f3', F4: 'f4', F5: 'f5', F6: 'f6', F7: 'f7', F8: 'f8',
  F9: 'f9', F10: 'f10', F11: 'f11', F12: 'f12', Backquote: 'grave', Minus: 'minus', Equal: 'equal',
  Backspace: 'backspace', Delete: 'delete', Insert: 'delete', Tab: 'tab', BracketLeft: 'lbracket',
  BracketRight: 'rbracket', Backslash: 'backslash', PageUp: 'pgup', CapsLock: 'capslock',
  Semicolon: 'semicolon', Quote: 'quote', Enter: 'enter', PageDown: 'pgdn', Shift: 'lshift',
  Comma: 'comma', Period: 'period', Slash: 'slash', ShiftRight: 'rshift', ArrowUp: 'up', End: 'end',
  Home: 'end', Ctrl: 'lctrl', Meta: 'lwin', Alt: 'lalt', Space: 'space', AltRight: 'ralt',
  CtrlRight: 'ralt', ArrowLeft: 'left', ArrowDown: 'down', ArrowRight: 'right',
};

function setupKeyHook() {
  let uio;
  try {
    uio = require('uiohook-napi');
  } catch (e) {
    console.warn('uiohook-napi unavailable, reactive effects only react inside the window', e);
    return false;
  }
  const { uIOhook, UiohookKey } = uio;
  const byCode = new Map();
  for (const [name, code] of Object.entries(UiohookKey)) {
    let id = KEY_IDS[name];
    if (!id && /^[A-Z]$/.test(name)) id = name.toLowerCase();
    if (!id && /^[0-9]$/.test(name)) id = name;
    if (id && !byCode.has(code)) byCode.set(code, id);
  }
  const forward = (down) => (e) => {
    const id = byCode.get(e.keycode);
    if (id && win && !win.isDestroyed()) win.webContents.send('key', { id, down });
  };
  uIOhook.on('keydown', forward(true));
  uIOhook.on('keyup', forward(false));
  try {
    uIOhook.start();
  } catch (e) {
    console.warn('uiohook start failed', e);
    return false;
  }
  app.on('will-quit', () => {
    try { uIOhook.stop(); } catch { /* already stopped */ }
  });
  return true;
}

function setupTray() {
  const img = nativeImage.createFromPath(iconPath()).resize({ width: 16, height: 16 });
  tray = new Tray(img);
  tray.setToolTip('AULA F75 Studio');
  const menu = Menu.buildFromTemplate([
    { label: 'AULA F75 Studio\'yu Aç', click: showWindow },
    { type: 'separator' },
    { label: 'Efekti Duraklat / Devam', click: () => win && win.webContents.send('tray:toggle') },
    { type: 'separator' },
    { label: 'Çıkış', click: () => { quitting = true; app.quit(); } },
  ]);
  tray.setContextMenu(menu);
  tray.on('click', showWindow);
}

function setupIpc(hookOk) {
  ipcMain.on('win:minimize', () => win && win.minimize());
  ipcMain.on('win:maximize', () => {
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  ipcMain.on('win:close', () => win && win.close());
  ipcMain.on('app:quit', () => { quitting = true; app.quit(); });
  ipcMain.on('settings:closeToTray', (_e, v) => { closeToTray = !!v; });
  ipcMain.handle('settings:autostart:get', () => app.getLoginItemSettings().openAtLogin);
  ipcMain.handle('settings:autostart:set', (_e, on) => {
    app.setLoginItemSettings({ openAtLogin: !!on, args: ['--hidden'] });
    return app.getLoginItemSettings().openAtLogin;
  });
  ipcMain.handle('app:info', () => ({ version: app.getVersion(), globalKeys: hookOk }));
}

app.whenReady().then(() => {
  setupHid();
  createWindow();
  const hookOk = setupKeyHook();
  setupIpc(hookOk);
  setupTray();
});

// Let the renderer hand the keyboard back to its own effect before exiting.
let quitConfirmed = false;
app.on('before-quit', (e) => {
  quitting = true;
  if (quitConfirmed || !win || win.isDestroyed()) return;
  e.preventDefault();
  win.webContents.send('app:before-quit');
  setTimeout(() => { quitConfirmed = true; app.quit(); }, 3000);
});
ipcMain.on('app:quit-ready', () => { quitConfirmed = true; app.quit(); });
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

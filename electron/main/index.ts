import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { release } from 'node:os'
import { join } from 'node:path'
import installExtension, { REDUX_DEVTOOLS } from 'electron-devtools-installer';
import path from 'path'
import sqlite3 from 'sqlite3'
import fs from 'fs';
import { Menu } from 'electron';

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.js    > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.DIST_ELECTRON = join(__dirname, '../')
process.env.DIST = join(process.env.DIST_ELECTRON, '../dist')
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? join(process.env.DIST_ELECTRON, '../public')
  : process.env.DIST

// Disable GPU Acceleration for Windows 7
if (release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

// Remove electron security warnings
// This warning only shows in development mode
// Read more on https://www.electronjs.org/docs/latest/tutorial/security
// process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

let win: BrowserWindow | null = null
// Here, you can also use other preload
const preload = join(__dirname, '../preload/index.js')
const url = process.env.VITE_DEV_SERVER_URL
const indexHtml = join(process.env.DIST, 'index.html')

async function createWindow() {
  win = new BrowserWindow({
    title: 'Main window',
    icon: join(process.env.PUBLIC, 'favicon.ico'),
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) { // electron-vite-vue#298
    win.loadURL(url)
    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  const menu = Menu.buildFromTemplate([])
  Menu.setApplicationMenu(menu)
})

app.whenReady().then(createWindow)

app.whenReady().then(() => {
  installExtension(REDUX_DEVTOOLS)
      .then((name) => console.log(`Added Extension:  ${name}`))
      .catch((err) => console.log('An error occurred: ', err));
});

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

app.on('ready', () => {
  const userDataPath = app.getPath('userData');
  const dbFolder = 'database'; // Nombre de la carpeta para la base de datos
  const dbPath = path.join(userDataPath, dbFolder, 'data.db');
  const autoSaveFolder = 'autoGuardado'; // Nombre de la carpeta para el guardado automático
  const autoSavePath = path.join(userDataPath, autoSaveFolder, 'data.db');

  // Verifica si la carpeta dbFolder el data.db existe, y si no existe, la crea
  if (!fs.existsSync(path.join(userDataPath, dbFolder))) {
    fs.mkdirSync(path.join(userDataPath, dbFolder));
  }

  // Verifica si la carpeta para el guardado automático existe, y si no existe, la crea
  if (!fs.existsSync(path.join(userDataPath, autoSaveFolder))) {
    fs.mkdirSync(path.join(userDataPath, autoSaveFolder));
  }

  const db = new sqlite3.Database(dbPath);

  db.serialize(() => {
    // Crea la tabla de usuarios si no existe
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL,
      email TEXT NOT NULL
    )`);

    // Verifica si ya existe un usuario con id 1
    db.get(`SELECT * FROM usuarios WHERE id = 1`, (error, row) => {
      if (!row) {
        // Si no existe, inserta un nuevo usuario
        db.run(`INSERT INTO usuarios (id, nombre, email) VALUES (1, 'Juan', 'juan@example.com')`);
      }
    });

    // Recupera todos los usuarios y los envía al renderer
    db.all(`SELECT * FROM usuarios`, (error, rows) => {
      if (error) {
        throw error;
      }
      win?.webContents.send('usuarios', rows);
    });

    // Establece un intervalo para realizar el guardado automático cada 5 segundos
    setInterval(() => {
      // Copia el archivo data.db a la carpeta para el guardado automático
      fs.copyFileSync(dbPath, autoSavePath);
    }, 120000);
  });
});

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${url}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})
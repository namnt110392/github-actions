const { app, BrowserWindow } = require('electron')
const path = require('path')
const isDev = require("electron-is-dev")
const { PythonShell } = require('python-shell')
const { execFile } = require("child_process")

const API_PROD_PATH = path.join(process.resourcesPath, "../lib/api/api.exe")
const API_DEV_PATH = path.join(__dirname, "../../../engine/api.py")
const INDEX_PATH = path.join(__dirname, '../../src/index.html')
const app_instance = app.requestSingleInstanceLock()

let pyshell = null
let prodProcess = null

if (isDev) {
  try {
    require('electron-reloader')(module)
  } catch (_) {}

  // giữ reference tới pyshell 
  pyshell = new PythonShell(API_DEV_PATH)
} else {
  // giữ reference tới process
  prodProcess = execFile(API_PROD_PATH, { windowsHide: true })
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  })

  mainWindow.loadFile(INDEX_PATH)

  if (isDev) mainWindow.webContents.openDevTools()

  if (!app_instance) {
    app.quit()
  } else {
    app.on("second-instance", () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
      }
    })
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// kill all child process before quit
app.on("before-quit", function () {
  if (isDev && pyshell) {
    pyshell.terminate()
  } else if (prodProcess) {
    prodProcess.kill("SIGINT")
  }
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})


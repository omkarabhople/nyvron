const { app, BrowserWindow } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

let mainWindow = null;

async function startBackend() {
  const serverPath = path.join(__dirname, 'backend', 'server.js');
  try {
    await import(pathToFileURL(serverPath).href);
    console.log('Backend server started successfully in main process.');
  } catch (err) {
    console.error('Failed to start backend server:', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    minWidth: 420,
    minHeight: 600,
    titleBarStyle: 'hiddenInset', // Apple-inspired seamless top titlebar
    titleBarOverlay: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Give backend 1.5 seconds to start up before loading page
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:3000').catch((err) => {
      console.error('Failed to load page, retrying...', err);
      setTimeout(() => {
        mainWindow.loadURL('http://localhost:3000');
      }, 1000);
    });
  }, 1500);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

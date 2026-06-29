const { app, BrowserWindow } = require('electron');
const { fork } = require('child_process');
const path = require('path');

let serverProcess = null;
let mainWindow = null;

function startBackend() {
  // Spawn backend server as a child process
  const serverPath = path.join(__dirname, 'backend', 'server.js');
  serverProcess = fork(serverPath, [], {
    env: { ...process.env, PORT: 3000 }
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start backend server:', err);
  });

  serverProcess.on('exit', (code, signal) => {
    console.log(`Backend server exited with code ${code} and signal ${signal}`);
  });
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
  // Close the backend Express process when the window closes
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

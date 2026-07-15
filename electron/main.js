const { app, BrowserWindow, ipcMain, dialog, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const net = require("net");
const { spawn } = require("child_process");

// ponytail: fixed port 3000 collides with whatever else a user already has running
// there; ask the OS for a free loopback port instead so we can't ever pick up the
// wrong server.
function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

// ponytail: without this, impatiently double-clicking the icon while the server
// is still booting launches a new full process per click, and they all pop their
// window open together once the (shared) port finally answers.
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

let PORT;
const userDataDir = app.getPath("userData");
const dbPath = path.join(userDataDir, "app.db");
const configPath = path.join(userDataDir, "config.json");

const appRoot = app.isPackaged
  ? path.join(process.resourcesPath, "app")
  : path.join(__dirname, "..");

let serverProcess;
let mainWindow;
// True from boot() until the main window exists, so closing the transient
// settings window during handoff doesn't trip window-all-closed and quit us.
let launching = false;

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

function ensureDb() {
  if (fs.existsSync(dbPath)) return;
  const templateDb = app.isPackaged
    ? path.join(process.resourcesPath, "template.db")
    : path.join(appRoot, "build", "template.db");
  fs.copyFileSync(templateDb, dbPath);
}

function loadConfig() {
  if (!fs.existsSync(configPath)) return {};
  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

function saveConfig(cfg) {
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2));
}

function serverEnv(cfg) {
  return {
    DATABASE_URL: `file:${dbPath.replace(/\\/g, "/")}`,
    GEMINI_API_KEY: cfg.GEMINI_API_KEY || "",
  };
}

function startServer(env) {
  const serverEntry = path.join(appRoot, ".next", "standalone", "server.js");
  // process.execPath is the Electron binary; ELECTRON_RUN_AS_NODE makes it run
  // server.js as plain Node instead of booting a second GUI instance.
  serverProcess = spawn(process.execPath, [serverEntry], {
    cwd: path.join(appRoot, ".next", "standalone"),
    env: {
      ...process.env,
      ...env,
      PORT: String(PORT),
      HOSTNAME: "127.0.0.1",
      ELECTRON_RUN_AS_NODE: "1",
    },
    stdio: "inherit",
  });
  serverProcess.on("error", (err) => {
    dialog.showErrorBox("Failed to start server", err.message);
    app.quit();
  });
  serverProcess.on("exit", (code) => {
    if (!mainWindow && code !== 0) {
      dialog.showErrorBox("Server exited unexpectedly", `Exit code: ${code}`);
      app.quit();
    }
  });
}

function waitForServer(url, cb, deadline = Date.now() + 60000) {
  http.get(url, () => cb()).on("error", () => {
    if (Date.now() > deadline) {
      dialog.showErrorBox("Server didn't start", "The app server failed to start within 60 seconds.");
      app.quit();
      return;
    }
    setTimeout(() => waitForServer(url, cb, deadline), 300);
  });
}

function buildMenu() {
  // Menu bar auto-hides for a clean look; press Alt to reveal "Set API Key".
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "Settings",
        submenu: [
          { label: "Set Gemini API Key…", click: () => showSettingsWindow() },
          { type: "separator" },
          { role: "quit" },
        ],
      },
    ])
  );
}

function createWindow() {
  if (mainWindow) return;
  launching = false;
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    title: "Proposal Generator",
    autoHideMenuBar: true,
  });
  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
  mainWindow.on("closed", () => { mainWindow = null; });
}

async function boot(cfg) {
  launching = true;
  PORT = await getFreePort();
  startServer(serverEnv(cfg));
  waitForServer(`http://127.0.0.1:${PORT}`, createWindow);
}

// Re-launch the server with a fresh key on a new port, then reload the window.
// ponytail: new port each time avoids racing the old one on port reuse.
async function restartServer(cfg) {
  if (serverProcess) serverProcess.kill();
  PORT = await getFreePort();
  startServer(serverEnv(cfg));
  waitForServer(`http://127.0.0.1:${PORT}`, () => {
    if (mainWindow) mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
  });
}

function showSettingsWindow() {
  const win = new BrowserWindow({
    width: 480,
    height: 340,
    resizable: false,
    title: "Proposal Generator — Setup",
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, "preload.js") },
  });
  win.loadFile(path.join(__dirname, "settings.html"));

  const onSave = (_event, apiKey) => {
    const cfg = loadConfig();
    cfg.GEMINI_API_KEY = apiKey;
    saveConfig(cfg);
    win.close();
    if (mainWindow) restartServer(cfg); // already running -> apply new key
    else boot(cfg); // first run -> start the app
  };
  ipcMain.once("settings:save", onSave);
  win.on("closed", () => ipcMain.removeListener("settings:save", onSave));
}

app.whenReady().then(() => {
  ensureDb();
  buildMenu();
  // Gate on whether setup has run, not on the key value — the setup screen lets
  // users leave the key blank and set it later, so a blank key must not re-prompt.
  if (!fs.existsSync(configPath)) {
    showSettingsWindow();
  } else {
    boot(loadConfig());
  }
});

app.on("window-all-closed", () => {
  if (launching) return; // settings -> main window handoff in progress
  if (serverProcess) serverProcess.kill();
  app.quit();
});

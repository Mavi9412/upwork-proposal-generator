const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { spawn } = require("child_process");

const PORT = 3000;
const userDataDir = app.getPath("userData");
const dbPath = path.join(userDataDir, "app.db");
const configPath = path.join(userDataDir, "config.json");

const appRoot = app.isPackaged
  ? path.join(process.resourcesPath, "app")
  : path.join(__dirname, "..");

let serverProcess;
let mainWindow;

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

function startServer(env) {
  const serverEntry = path.join(appRoot, ".next", "standalone", "server.js");
  serverProcess = spawn(process.execPath, [serverEntry], {
    cwd: path.join(appRoot, ".next", "standalone"),
    env: { ...process.env, ...env, PORT: String(PORT), HOSTNAME: "127.0.0.1" },
    stdio: "inherit",
  });
}

function waitForServer(url, cb) {
  http.get(url, () => cb()).on("error", () => setTimeout(() => waitForServer(url, cb), 300));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    title: "Proposal Generator",
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
}

function boot(cfg) {
  startServer({
    DATABASE_URL: `file:${dbPath.replace(/\\/g, "/")}`,
    GEMINI_API_KEY: cfg.GEMINI_API_KEY || "",
  });
  waitForServer(`http://127.0.0.1:${PORT}`, createWindow);
}

function showSettingsWindow() {
  const win = new BrowserWindow({
    width: 480,
    height: 340,
    resizable: false,
    title: "Proposal Generator — Setup",
    webPreferences: { preload: path.join(__dirname, "preload.js") },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, "settings.html"));

  ipcMain.once("settings:save", (_event, apiKey) => {
    const cfg = { GEMINI_API_KEY: apiKey };
    saveConfig(cfg);
    win.close();
    boot(cfg);
  });
}

app.whenReady().then(() => {
  ensureDb();
  const cfg = loadConfig();
  if (!cfg.GEMINI_API_KEY) {
    showSettingsWindow();
  } else {
    boot(cfg);
  }
});

app.on("window-all-closed", () => {
  if (serverProcess) serverProcess.kill();
  app.quit();
});

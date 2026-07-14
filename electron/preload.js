const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("settingsAPI", {
  save: (apiKey) => ipcRenderer.send("settings:save", apiKey),
});

const { contextBridge, ipcRenderer } = require("electron");

// Bridge for the in-app update notification banner.
// main.js emits these channels from setupAutoUpdate(); the renderer
// subscribes via window.updates.* in src/components/updateNotification.tsx.
contextBridge.exposeInMainWorld("updates", {
  onAvailable: (cb) => {
    const listener = (_e, info) => cb(info);
    ipcRenderer.on("update-available", listener);
    return () => ipcRenderer.removeListener("update-available", listener);
  },
  onDownloadProgress: (cb) => {
    const listener = (_e, info) => cb(info);
    ipcRenderer.on("update-download-progress", listener);
    return () => ipcRenderer.removeListener("update-download-progress", listener);
  },
  onDownloaded: (cb) => {
    const listener = (_e, info) => cb(info);
    ipcRenderer.on("update-downloaded", listener);
    return () => ipcRenderer.removeListener("update-downloaded", listener);
  },
  onError: (cb) => {
    const listener = (_e, info) => cb(info);
    ipcRenderer.on("update-error", listener);
    return () => ipcRenderer.removeListener("update-error", listener);
  },
  quitAndInstall: () => ipcRenderer.send("update-quit-and-install"),
  checkAgain: () => ipcRenderer.send("update-check-again"),
});

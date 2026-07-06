// When launched from VSCode/Claude Code, ELECTRON_RUN_AS_NODE may be set,
// which causes require("electron") to return the binary path string instead of
// Electron APIs. Self-restart without that variable — only in dev mode.
// In packaged apps __dirname always contains a "resources" segment; skip the
// guard there because the packaged .exe handles its own environment correctly.
const _path0 = require("path");
const _isPackaged = __dirname.split(_path0.sep).includes("resources");

if (process.env.ELECTRON_RUN_AS_NODE && !_isPackaged) {
  const { spawn } = require("child_process");
  const env = Object.assign({}, process.env);
  delete env.ELECTRON_RUN_AS_NODE;
  spawn(process.execPath, [_path0.join(__dirname, "..")], {
    env,
    stdio: "inherit",
    cwd: _path0.join(__dirname, ".."),
  }).on("close", (code) => process.exit(code ?? 0));
  return;
}

const { app, BrowserWindow, shell, dialog, ipcMain } = require("electron");
// electron-updater is `require`d lazily inside setupAutoUpdate() — see below.
// Doing it at the top of the file would force dev runs to resolve the module
// too, and if node_modules is even briefly out of sync the app crashes
// before reaching the `isDev` guard.
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");
const fs = require("fs");

const isDev = !app.isPackaged;
const PORT = isDev ? 3000 : 3001;

let devServer = null;

// Fire-and-forget warm-up requests so the user does not pay the cold-start
// cost (10MB index parse, route compilation) when they first navigate to a
// page. Triggered right after the window is created — runs in parallel with
// the first frame render.
function prewarmServer() {
  const paths = [
    "/api/games?light=1&limit=1",
    "/api/openings",
    "/api/folders/cover",
  ];
  for (const p of paths) {
    const req = http.get(`http://127.0.0.1:${PORT}${p}`, (res) => {
      res.resume();
      res.on("end", () => {});
    });
    req.on("error", () => {
      /* swallow — warm-up is best-effort */
    });
    req.end();
  }
}

function waitForServer(retries = 120) {
  return new Promise((resolve, reject) => {
    const check = () => {
      // Use 127.0.0.1 explicitly — on Windows 11 "localhost" may resolve to
      // ::1 (IPv6) while the server binds only to 127.0.0.1 (IPv4).
      const req = http.get(`http://127.0.0.1:${PORT}`, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (--retries > 0) setTimeout(check, 500);
        else reject(new Error(`White to Move server did not start on port ${PORT}`));
      });
      req.end();
    };
    check();
  });
}

function resolveDataDir() {
  if (process.env.WHITE_TO_MOVE_DATA_DIR) {
    return process.env.WHITE_TO_MOVE_DATA_DIR;
  }
  if (process.env.CHESSKIT_DATA_DIR) {
    return process.env.CHESSKIT_DATA_DIR;
  }

  const appRoot = isDev
    ? path.join(__dirname, "..")
    : path.dirname(app.getPath("exe"));

  if (!isDev) {
    const projectDataDir = path.join(
      app.getPath("documents"),
      "Programming",
      "Chesskit",
      "data"
    );
    if (fs.existsSync(projectDataDir)) {
      return projectDataDir;
    }
  }

  return path.join(appRoot, "data");
}

// Returns the app data dir, migrating data from legacy locations if needed.
function ensureDataDir() {
  const previousUserDataDir = path.join(app.getPath("userData"), "data");
  const dataDir = resolveDataDir();
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const isSamePath = (a, b) =>
    path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
  const isEmptyJsonContainer = (content) => {
    const trimmed = content.trim();
    return trimmed === "" || trimmed === "[]" || trimmed === "{}";
  };
  const hasUsefulJson = (filePath) => {
    try {
      return !isEmptyJsonContainer(fs.readFileSync(filePath, "utf-8"));
    } catch (_) {
      return false;
    }
  };
  const dirHasFiles = (dir) => {
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const child = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (dirHasFiles(child)) return true;
        } else {
          return true;
        }
      }
    } catch (_) {
      return false;
    }
    return false;
  };
  const gamesDirHasGameFiles = (dir) => {
    try {
      return fs
        .readdirSync(dir, { withFileTypes: true })
        .some((entry) => entry.isFile() && /^\d+\.json$/.test(entry.name));
    } catch (_) {
      return false;
    }
  };

  // Source dirs to migrate from (project root in dev, packaged standalone fallback)
  const legacyAppDataDirs = [
    // Older builds stored the real user library here.
    path.join(app.getPath("appData"), "chesskit", "data"),
    path.join(app.getPath("appData"), "white-to-move", "data"),
    path.join(app.getPath("appData"), "White to Move", "data"),
  ];
  const sourceDirs = [
    ...legacyAppDataDirs,
    previousUserDataDir,
    path.join(__dirname, "..", "data"),
    path.join(process.resourcesPath || "", ".electron-standalone", "data"),
    path.join(process.resourcesPath || "", "electron-standalone", "data"),
  ].filter((dir) => !isSamePath(dir, dataDir));

  // JSON files: migrate if dest is missing OR is an empty container.
  // folder-covers.json is a map ("{}") rather than an array ("[]") - the
  // empty-check below accepts both.
  const jsonFiles = [
    "games.json",
    "openings.json",
    "notes.json",
    "notes-images.json",
    "folder-covers.json",
  ];
  for (const file of jsonFiles) {
    const dest = path.join(dataDir, file);
    const content = fs.existsSync(dest)
      ? fs.readFileSync(dest, "utf-8").trim()
      : "";
    const destEmpty = isEmptyJsonContainer(content);
    if (!destEmpty) continue;

    let migrated = false;
    for (const srcDir of sourceDirs) {
      const src = path.join(srcDir, file);
      if (!hasUsefulJson(src)) continue;
      fs.writeFileSync(dest, fs.readFileSync(src, "utf-8"), "utf-8");
      migrated = true;
      break;
    }
    if (!migrated && !fs.existsSync(dest)) {
      // folder-covers.json is shaped as an object; everything else is an array.
      const empty = file === "folder-covers.json" ? "{}" : "[]";
      fs.writeFileSync(dest, empty, "utf-8");
    }
  }

  // Newer game storage is data/games/index.json plus one JSON file per game.
  // Copy it when the destination is empty so upgrades reconnect the DB/stats.
  const destGamesDir = path.join(dataDir, "games");
  const destGamesIndex = path.join(destGamesDir, "index.json");
  const destGamesEmpty =
    !hasUsefulJson(destGamesIndex) && !gamesDirHasGameFiles(destGamesDir);
  if (destGamesEmpty) {
    for (const srcDir of sourceDirs) {
      const srcGamesDir = path.join(srcDir, "games");
      const srcGamesIndex = path.join(srcGamesDir, "index.json");
      if (!hasUsefulJson(srcGamesIndex) && !gamesDirHasGameFiles(srcGamesDir)) {
        continue;
      }
      fs.mkdirSync(destGamesDir, { recursive: true });
      try {
        fs.cpSync(srcGamesDir, destGamesDir, { recursive: true });
        break;
      } catch (_) { /* skip on error */ }
    }
  }

  // Image directories: copy if dest doesn't exist yet or is still empty.
  for (const imageDir of ["notes-images", "folder-covers"]) {
    const destDir = path.join(dataDir, imageDir);
    if (dirHasFiles(destDir)) continue;
    for (const srcDir of sourceDirs) {
      const src = path.join(srcDir, imageDir);
      if (fs.existsSync(src)) {
        try {
          fs.cpSync(src, destDir, { recursive: true });
          break;
        } catch (_) { /* skip on error */ }
      }
    }
  }

  return dataDir;
}

function startDevServer() {
  const dataDir = ensureDataDir();
  const isWindows = process.platform === "win32";
  devServer = spawn("npm", ["run", "dev"], {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
    shell: isWindows,
    env: { ...process.env, DATA_DIR: dataDir },
  });
  devServer.on("error", (err) => console.error("Dev server error:", err));
}

function startProdServer() {
  const standaloneDir = path.join(process.resourcesPath, ".electron-standalone");

  if (!fs.existsSync(standaloneDir)) {
    throw new Error(
      `Standalone server not found at:\n${standaloneDir}\n\nRe-run "npm run electron-pack" to rebuild.`
    );
  }

  const dataDir = ensureDataDir();

  process.env.PORT = String(PORT);
  process.env.HOSTNAME = "127.0.0.1";
  process.env.DATA_DIR = dataDir;

  // Normal case: scripts/electron-after-pack.mjs already renamed the
  // shipped `_server_modules` → `node_modules` inside the packaged
  // standalone, so server.js resolves `require("next")` via stock
  // Node.js module resolution.
  //
  // Fallback for older installs (pre-afterPack builds) that still
  // ship `_server_modules` and lack a `node_modules`: point NODE_PATH
  // at it. We do NOT try to create a junction here — the install dir
  // is read-only for non-admin processes under Program Files, and a
  // write attempt aborts startup with a permission error.
  const nodeModulesDir = path.join(standaloneDir, "node_modules");
  const legacyServerModulesDir = path.join(standaloneDir, "_server_modules");
  if (!fs.existsSync(nodeModulesDir) && fs.existsSync(legacyServerModulesDir)) {
    process.env.NODE_PATH = legacyServerModulesDir;
    require("module").Module._initPaths();
    // Legacy users will get a working install next time they upgrade
    // (the new build ships `node_modules` directly). For this session
    // NODE_PATH lets `require('next')` resolve from the global paths.
  }

  // Change cwd so Next.js standalone can find its assets
  process.chdir(standaloneDir);
  require(path.join(standaloneDir, "server.js"));
}

// ─────────────────────────── Auto-update wiring ───────────────────────────
//
// Checks the GitHub Releases feed (configured under "publish" in package.json)
// for a newer version on startup. When one is found, it downloads in the
// background and, once ready, asks the user via a dialog whether to install
// now (relaunches the app) or later (applies on next quit). All of this is
// no-op in dev mode — electron-updater bails out when app.isPackaged is false.

function setupAutoUpdate(getWindow) {
  if (isDev) return; // no updates during local dev

  let autoUpdater;
  try {
    ({ autoUpdater } = require("electron-updater"));
  } catch (err) {
    console.error("[updater] electron-updater not bundled, skipping:", err?.message ?? err);
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  // Forwards an event from electron-updater to the renderer banner.
  // Safe no-op if the window has already been destroyed.
  const send = (channel, payload) => {
    const win = getWindow();
    if (!win || win.isDestroyed()) return;
    win.webContents.send(channel, payload);
  };

  autoUpdater.on("error", (err) => {
    console.error("[updater] error:", err?.message ?? err);
    send("update-error", { message: err?.message ?? String(err) });
  });

  autoUpdater.on("update-available", (info) => {
    console.log(`[updater] update available: v${info?.version}`);
    send("update-available", { version: info?.version });
  });

  autoUpdater.on("update-not-available", () => {
    console.log("[updater] up to date");
  });

  autoUpdater.on("download-progress", (progress) => {
    send("update-download-progress", {
      percent: progress?.percent ?? 0,
      bytesPerSecond: progress?.bytesPerSecond ?? 0,
      transferred: progress?.transferred ?? 0,
      total: progress?.total ?? 0,
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log(`[updater] update downloaded: v${info?.version}`);
    send("update-downloaded", { version: info?.version });
  });

  // Renderer triggers the install from the in-app banner.
  ipcMain.on("update-quit-and-install", () => {
    try {
      autoUpdater.quitAndInstall();
    } catch (err) {
      console.error("[updater] quitAndInstall failed:", err?.message ?? err);
    }
  });

  // Renderer retries after an error (e.g. once the user has closed
  // whatever was locking the update cache, or antivirus cleared it).
  ipcMain.on("update-check-again", () => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error("[updater] retry checkForUpdates failed:", err?.message ?? err);
      send("update-error", { message: err?.message ?? String(err) });
    });
  });

  // Kick off the check shortly after launch so the window is already visible.
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error("[updater] checkForUpdates failed:", err?.message ?? err);
    });
  }, 3000);
}

function createWindow() {
  const iconPath = isDev
    ? path.join(__dirname, "..", "public", "favicon.png")
    : path.join(process.resourcesPath, "icon.png");

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    icon: iconPath,
    title: "White to Move",
    backgroundColor: "#2b2b2b",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.setMenuBarVisibility(false);
  win.loadURL(`http://127.0.0.1:${PORT}`);

  // Show window once page is ready (avoids white flash)
  win.once("ready-to-show", () => win.show());

  // Open external links in the system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  return win;
}

app.whenReady().then(async () => {
  try {
    if (isDev) {
      startDevServer();
    } else {
      startProdServer();
    }

    await waitForServer();
    const mainWindow = createWindow();
    setupAutoUpdate(() => mainWindow);
    prewarmServer();
  } catch (err) {
    dialog.showErrorBox("White to Move failed to start", String(err?.message ?? err));
    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (devServer) devServer.kill();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (devServer) devServer.kill();
});

/**
 * electron-builder afterPack hook.
 *
 * Renames `_server_modules` → `node_modules` inside the packaged
 * `resources/.electron-standalone/` folder so the Next.js standalone
 * server can resolve `require('next')` via standard Node.js resolution
 * — no runtime junctions or NODE_PATH dance needed.
 *
 * Why the rename exists in the first place:
 *   scripts/electron-build.mjs renames `.next/standalone/node_modules`
 *   to `_server_modules` because electron-builder's extraResources copy
 *   silently strips nested `node_modules/` directories. Renaming
 *   side-steps that filter. Here we put the name back AFTER the copy.
 *
 * Doing it here (instead of in main.js at startup) means the rename
 * happens while the installer/dir output is still writable. Once
 * NSIS drops the bundle into `C:\Program Files\White to Move\`, that dir
 * is read-only for non-admin processes and any runtime rename fails.
 */
import { existsSync, renameSync, rmSync } from "fs";
import { join } from "path";

// Windows Defender (or another AV/indexer) frequently holds a transient lock
// on files right after electron-builder copies them, which turns this rename
// into a flaky EPERM instead of a real failure. A short retry-with-backoff
// clears it almost every time without requiring the user to close anything.
const RETRY_DELAYS_MS = [200, 500, 1000, 2000, 3000];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withEpermRetry(fn, label) {
  for (let attempt = 0; ; attempt++) {
    try {
      fn();
      return;
    } catch (err) {
      if (err?.code !== "EPERM" && err?.code !== "EBUSY") throw err;
      if (attempt >= RETRY_DELAYS_MS.length) throw err;
      const delay = RETRY_DELAYS_MS[attempt];
      console.log(
        `[afterPack] ${label} hit ${err.code}, retrying in ${delay}ms (attempt ${attempt + 1}/${RETRY_DELAYS_MS.length})`
      );
      await sleep(delay);
    }
  }
}

export default async function afterPack(context) {
  const standaloneDir = join(
    context.appOutDir,
    "resources",
    ".electron-standalone"
  );
  const serverModules = join(standaloneDir, "_server_modules");
  const nodeModules = join(standaloneDir, "node_modules");

  if (!existsSync(serverModules)) {
    console.log(
      `[afterPack] _server_modules not found at ${serverModules} — skipping`
    );
    return;
  }

  if (existsSync(nodeModules)) {
    await withEpermRetry(
      () => rmSync(nodeModules, { recursive: true, force: true }),
      "rmSync(node_modules)"
    );
  }
  await withEpermRetry(
    () => renameSync(serverModules, nodeModules),
    "renameSync(_server_modules → node_modules)"
  );
  console.log(
    "[afterPack] renamed packaged _server_modules → node_modules"
  );
}

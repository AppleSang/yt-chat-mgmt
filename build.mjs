/* Build extension into dist/ for Chrome load-unpacked. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const esbuild = require("esbuild");

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist");

const watch = process.argv.includes("--watch");

const copy = (src, dest) => {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
};

const copyDir = (src, dest) => {
  if (!fs.existsSync(src)) return;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else copy(s, d);
  }
};

const cleanDist = () => {
  // Chrome holds a lock on dist/ while the extension is loaded from it -
  // clean on a best-effort basis instead of failing the build.
  if (fs.existsSync(dist)) {
    try {
      fs.rmSync(dist, { recursive: true, force: true });
    } catch (e) {
      console.warn("warn: could not fully clean dist/ (locked by Chrome?), overwriting in place");
    }
  }
  fs.mkdirSync(dist, { recursive: true });
};

const entries = [
  { in: "src/background/index.ts", out: "background.js" },
  { in: "src/content/inject.ts", out: "content/inject.js" },
  { in: "src/content/index.ts", out: "content/content.js" },
  { in: "src/popup/popup.ts", out: "popup/popup.js" }
];

const buildAll = () => {
  cleanDist();

  for (const e of entries) {
    esbuild.buildSync({
      entryPoints: [path.join(root, e.in)],
      outfile: path.join(dist, e.out),
      bundle: true,
      format: "iife",
      target: ["chrome120"],
      platform: "browser",
      minify: false,
      sourcemap: false,
      legalComments: "none"
    });
  }

  copy(path.join(root, "public", "manifest.json"), path.join(dist, "manifest.json"));
  copy(path.join(root, "public", "emotes.json"), path.join(dist, "emotes.json"));
  copyDir(path.join(root, "public", "images"), path.join(dist, "images"));
  copyDir(path.join(root, "public", "icons"), path.join(dist, "icons"));
  copyDir(path.join(root, "public", "popup"), path.join(dist, "popup"));

  console.log("build ok -> dist/");
};

const runTypecheck = () => {
  const tscJs = path.join(root, "node_modules", "typescript", "lib", "tsc.js");
  const r = require("child_process").spawnSync(
    process.execPath,
    [tscJs, "--noEmit"],
    { stdio: "inherit", cwd: root }
  );
  if (r.status !== 0) process.exit(r.status || 1);
};

runTypecheck();
buildAll();

if (watch) {
  const watcher = require("fs").watch;
  const dirs = ["src", "public"];
  let timer = null;
  const rebuild = () => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      try {
        buildAll();
      } catch (e) {
        console.error("rebuild fail:", e && e.message);
      }
    }, 200);
  };
  for (const d of dirs) {
    try {
      watcher(path.join(root, d), { recursive: true }, rebuild);
    } catch (e) {}
  }
  console.log("watching for changes...");
}

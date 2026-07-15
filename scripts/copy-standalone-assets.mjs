// Next's standalone output doesn't include public/ or .next/static — copy them in.
// It also *traces* node_modules and silently omits files loaded at runtime (the
// pdfjs worker, native engines, fonts), which breaks on a clean machine that only
// has the bundle. So instead of trusting the trace, we overlay the FULL production
// node_modules — dev-only tooling excluded — so nothing can ever be missing.
import { cpSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const standalone = path.join(root, ".next", "standalone");
const nodeModules = path.join(root, "node_modules");

cpSync(path.join(root, "public"), path.join(standalone, "public"), { recursive: true });
cpSync(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"), { recursive: true });

// Dev-only top-level dirs the running app never needs (Electron alone is ~250MB).
const SKIP = new Set([
  "electron", "electron-builder", "app-builder-lib", "dmg-builder", "@electron",
  "eslint", "eslint-config-next", "@eslint", ".cache", ".bin",
]);

cpSync(nodeModules, path.join(standalone, "node_modules"), {
  recursive: true,
  filter: (src) => {
    // Only filter the direct children of node_modules; keep everything deeper.
    if (path.dirname(src) === nodeModules) return !SKIP.has(path.basename(src));
    return true;
  },
});

console.log("Copied public/, .next/static, and full production node_modules into .next/standalone");

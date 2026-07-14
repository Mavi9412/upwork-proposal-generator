// Produces a fresh, empty sqlite db (schema only) shipped inside the installer.
// The Electron app copies this to each user's data folder on first run.
import { existsSync, mkdirSync, rmSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const buildDir = path.join(root, "build");
const dbPath = path.join(buildDir, "template.db");

mkdirSync(buildDir, { recursive: true });
if (existsSync(dbPath)) rmSync(dbPath);

execSync("npx prisma db push --skip-generate", {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: `file:${dbPath.replace(/\\/g, "/")}` },
});

console.log("Template database created at", dbPath);

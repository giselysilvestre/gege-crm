import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env.local");
const text = fs.readFileSync(envPath, "utf8");

for (const line of text.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (!m) continue;
  const key = m[1];
  const value = m[2].replace(/^"|"$/g, "").trim();
  if (!value) continue;
  console.log(`Adding ${key}...`);
  execFileSync(
    "npx",
    ["--yes", "vercel@latest", "env", "add", key, "production", "--force", "--sensitive"],
    { cwd: root, input: value, stdio: ["pipe", "inherit", "inherit"], shell: true }
  );
}

console.log("Done.");

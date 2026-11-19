#!/usr/bin/env node
// Fails (exit 1) if the Supabase secret key is referenced anywhere under src/
// except the two files allowed to touch it (Architecture §9), or if any
// variable that looks secret is exposed with the NEXT_PUBLIC_ prefix.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ALLOWED = new Set(["lib/supabase/admin.ts", "lib/env.server.ts", "lib/env-schema.ts"]);

const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|json)$/;

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (SOURCE_EXT.test(entry.name)) yield full;
  }
}

/** @returns {{ file: string, line: number, reason: string }[]} */
export function findSecretLeaks(srcDir) {
  const leaks = [];
  if (!fs.existsSync(srcDir)) return leaks;
  for (const file of walk(srcDir)) {
    const rel = path.relative(srcDir, file).split(path.sep).join("/");
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((text, i) => {
      if (text.includes("SUPABASE_SECRET_KEY") && !ALLOWED.has(rel)) {
        leaks.push({ file: rel, line: i + 1, reason: "SUPABASE_SECRET_KEY outside allowed files" });
      }
      if (/NEXT_PUBLIC_[A-Z0-9_]*(SECRET|PASSWORD|SERVICE_ROLE)/.test(text)) {
        leaks.push({ file: rel, line: i + 1, reason: "secret-looking NEXT_PUBLIC_ variable" });
      }
    });
  }
  return leaks;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const leaks = findSecretLeaks(path.join(root, "src"));
  if (leaks.length > 0) {
    console.error("Secret key check failed:");
    for (const l of leaks) console.error(`  src/${l.file}:${l.line} — ${l.reason}`);
    process.exit(1);
  }
  console.log("Secret key check passed.");
}

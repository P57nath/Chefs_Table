import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { findSecretLeaks } from "../../scripts/check-secrets.mjs";

let dir: string;

function write(rel: string, content: string) {
  const full = path.join(dir, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

afterEach(() => {
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
});

describe("findSecretLeaks", () => {
  it("allows the secret key only in the admin client and server env", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "secrets-"));
    write("lib/supabase/admin.ts", "serverEnv.SUPABASE_SECRET_KEY");
    write("lib/env.server.ts", "process.env.SUPABASE_SECRET_KEY");
    expect(findSecretLeaks(dir)).toEqual([]);
  });

  it("flags the secret key in a component", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "secrets-"));
    write("features/guest/menu.tsx", "\nconst k = process.env.SUPABASE_SECRET_KEY");
    expect(findSecretLeaks(dir)).toEqual([
      { file: "features/guest/menu.tsx", line: 2, reason: expect.stringContaining("outside") },
    ]);
  });

  it("flags secrets exposed with the NEXT_PUBLIC_ prefix", () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "secrets-"));
    write("lib/x.ts", "process.env.NEXT_PUBLIC_SSLCOMMERZ_STORE_PASSWORD");
    expect(findSecretLeaks(dir)).toHaveLength(1);
  });
});

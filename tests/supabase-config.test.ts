import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { IRONMALLAS_SUPABASE_URL, resolveSupabaseConfig } from "../src/lib/supabase/config";

test("application clients accept only the exclusive Iron Mallas project", () => {
  const key = "synthetic-public-key";
  assert.deepEqual(resolveSupabaseConfig(IRONMALLAS_SUPABASE_URL, key), { url: IRONMALLAS_SUPABASE_URL, key });
  assert.deepEqual(resolveSupabaseConfig(`${IRONMALLAS_SUPABASE_URL}/`, key), { url: IRONMALLAS_SUPABASE_URL, key });
  for (const url of [undefined, "", "https://another-project.supabase.co", "http://kqdcotpfzluxkqdkgyts.supabase.co",
    `${IRONMALLAS_SUPABASE_URL}.example.invalid`, `${IRONMALLAS_SUPABASE_URL}/rest/v1`,
    `${IRONMALLAS_SUPABASE_URL}?project=other`, "https://user:password@kqdcotpfzluxkqdkgyts.supabase.co"]) {
    assert.equal(resolveSupabaseConfig(url, key), null);
  }
  assert.equal(resolveSupabaseConfig(IRONMALLAS_SUPABASE_URL, undefined), null);
  assert.equal(resolveSupabaseConfig(IRONMALLAS_SUPABASE_URL, "  "), null);
});

test("bootstrap rejects a foreign project before attempting a network request", () => {
  const result = spawnSync(process.execPath, ["--import", "tsx", "scripts/bootstrap-admin.ts", "--confirm-development"], {
    encoding: "utf8", timeout: 15000,
    env: { ...process.env, IRONMALLAS_ENV: "development", NEXT_PUBLIC_SUPABASE_URL: "https://foreign.example.invalid",
      SUPABASE_SECRET_KEY: "synthetic-secret-not-a-real-key", BOOTSTRAP_ADMIN_EMAIL: "fixture@example.invalid",
      BOOTSTRAP_ADMIN_NAME: "Fixture administrator", AUTH_SITE_URL: "http://localhost:3000" },
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /solo admite el proyecto exclusivo/);
  assert.doesNotMatch(result.stderr + result.stdout, /synthetic-secret|fixture@example/);
});

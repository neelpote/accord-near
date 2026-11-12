import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

function config(env) {
  return spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e",
    'const {default:c}=await import("./next.config.ts"); console.log(JSON.stringify(await c.rewrites()));'],
    { cwd: new URL("..", import.meta.url), env: { ...process.env, VERCEL: "", ACCORD_API_URL: "", ACCORD_VERCEL_SERVICES: "", ...env }, encoding: "utf8" });
}

test("Vercel refuses a missing, local, insecure or credential-bearing upstream", () => {
  for (const url of ["", "http://localhost:4000", "https://localhost:4000", "http://api.example.com", "https://user:password@api.example.com", "https://api.example.com?token=test"]) {
    assert.notEqual(config({ VERCEL: "1", ACCORD_API_URL: url }).status, 0, url);
  }
});

test("public upstream preserves the API rewrite without a double slash", () => {
  const result = config({ VERCEL: "1", ACCORD_API_URL: "https://api.example.com/" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout)[0].destination, "https://api.example.com/:path*");
});

test("local development keeps the existing loopback API", () => {
  const result = config({ ACCORD_API_URL: "http://127.0.0.1:4000" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout)[0].destination, "http://127.0.0.1:4000/:path*");
});

test("Vercel services route API requests before Next without a loopback rewrite", () => {
  const result = config({ VERCEL: "1", ACCORD_VERCEL_SERVICES: "true" });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), []);
});

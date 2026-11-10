import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fixtureKey } from "./fixture-keys.js";
test("fixture setup preserves existing keys and fails closed on invalid data or RPC failure", async () => {
  const dir = await mkdtemp(join(tmpdir(), "accord-fixtures-")),
    file = join(dir, "buyer.json");
  try {
    await writeFile(file, "invalid-existing-file");
    await assert.rejects(
      () => fixtureKey(file, "buyer.testnet", async () => false),
      /Existing fixture credentials/,
    );
    assert.equal(await readFile(file, "utf8"), "invalid-existing-file");
    await rm(file);
    await assert.rejects(
      () =>
        fixtureKey(file, "buyer.testnet", async () => {
          throw new Error("RPC unavailable");
        }),
      /RPC unavailable/,
    );
    await assert.rejects(() => stat(file));
    await assert.rejects(
      () => fixtureKey(file, "buyer.testnet", async () => true),
      /no local fixture credentials/,
    );
    await assert.rejects(() => stat(file));
    const first = await fixtureKey(file, "buyer.testnet", async () => false),
      original = await readFile(file, "utf8");
    const same = await fixtureKey(file, "buyer.testnet", async () => true);
    assert.equal(
      same.getPublicKey().toString(),
      first.getPublicKey().toString(),
    );
    assert.equal(await readFile(file, "utf8"), original);
    assert.equal((await stat(file)).mode & 0o777, 0o600);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

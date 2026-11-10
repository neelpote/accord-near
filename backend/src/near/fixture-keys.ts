import { readFile, writeFile } from "node:fs/promises";
import { KeyPair } from "near-api-js";
/** Developer fixtures only. Existing credential files are never replaced, even after an RPC error. */
export async function fixtureKey(
  path: string,
  accountId: string,
  accountExists: () => Promise<boolean>,
) {
  let raw: string | undefined;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (raw !== undefined) {
    try {
      const saved = JSON.parse(raw);
      if (saved.account_id !== accountId) throw Error();
      const key = KeyPair.fromString(saved.private_key);
      if (key.getPublicKey().toString() !== saved.public_key) throw Error();
      return key;
    } catch {
      throw new Error(
        "Existing fixture credentials are invalid or belong to another account; restore them without overwriting the file",
      );
    }
  }
  if (await accountExists())
    throw new Error(
      "Existing account has no local fixture credentials; restore its key before proceeding",
    );
  const key = KeyPair.fromRandom("ed25519");
  await writeFile(
    path,
    JSON.stringify({
      account_id: accountId,
      private_key: key.toString(),
      public_key: key.getPublicKey().toString(),
    }),
    { mode: 0o600, flag: "wx" },
  );
  return key;
}

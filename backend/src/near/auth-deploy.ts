/** Explicit testnet-only deployment of the separate, stateless login receipt contract. */
import { Account, JsonRpcProvider, actions, baseEncode } from "near-api-js";
import { AccountDoesNotExistError } from "near-api-js/rpc-errors";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { fixtureKey } from "./fixture-keys.js";
const root = resolve(import.meta.dirname, "../../..");
const masterId = process.env["MASTER_ACCOUNT_ID"];
if (!masterId?.endsWith(".testnet")) throw Error("Explicit dedicated testnet parent required");
const rpc = new JsonRpcProvider({ url: "https://test.rpc.fastnear.com" }, { retries: 3, wait: 500, backoff: 1.5 });
if (await rpc.getNetworkId() !== "testnet") throw Error("Testnet only");
const credentials = JSON.parse(await readFile(resolve(homedir(), ".near-credentials/testnet", masterId + ".json"), "utf8"));
const master = new Account(masterId, rpc, credentials.private_key), id = "login." + masterId;
const path = resolve(root, ".near-credentials/auth.json");
async function exists() { try { await rpc.viewAccount({ accountId: id }); return true; } catch (e) { if (e instanceof AccountDoesNotExistError) return false; throw e; } }
const key = await fixtureKey(path, id, exists);
if (!(await exists())) await master.signAndSendTransaction({ receiverId: id, actions: [actions.createAccount(), actions.transfer(1200000000000000000000000n), actions.addFullAccessKey(key.getPublicKey())] });
const wasm = await readFile(process.env["AUTH_WASM_PATH"] || resolve(root, "contracts-auth/target/near/contracts_auth.wasm"));
const checksum = createHash("sha256").update(wasm).digest(), codeHash = baseEncode(checksum);
const account = new Account(id, rpc, key.toString()), before = await account.getState();
let transaction: string | null = null;
if (before.codeHash === "11111111111111111111111111111111") {
  transaction = (await account.signAndSendTransaction({ receiverId: id, actions: [actions.deployContract(wasm)] })).transaction.hash;
} else if (before.codeHash !== codeHash) throw Error("Existing login code differs; refusing an automatic upgrade");
if ((await account.getState()).codeHash !== codeHash) throw Error("Deployed login hash differs");
const escrow = "contract.accord-dev-261110.testnet";
const escrowHash = (await rpc.viewAccount({ accountId: escrow })).code_hash;
if (escrowHash !== "DfcbJBckRVsGXr1v6QARgrZthYDJ1EviULqYWaokLUTX") throw Error("Escrow hash changed; investigate before proceeding");
await writeFile(resolve(root, "docs/evm-auth-deployment.json"), JSON.stringify({ network: "testnet", contract: id, transaction, code_hash: codeHash, wasm_sha256: checksum.toString("hex"), escrow_contract: escrow, escrow_code_hash_unchanged: escrowHash, deployed_at: new Date().toISOString() }, null, 2) + "\n");
console.log("Separate testnet login contract verified:", id, codeHash);

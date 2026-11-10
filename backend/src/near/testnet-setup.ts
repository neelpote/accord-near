import { Account, JsonRpcProvider, KeyPair, actions } from "near-api-js";
import { readFile, writeFile, mkdir, chmod } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "../../..");
const masterId = process.env["MASTER_ACCOUNT_ID"];
if (!masterId || !masterId.endsWith(".testnet"))
  throw new Error(
    "Set MASTER_ACCOUNT_ID to your dedicated faucet-funded testnet account",
  );
const credentials = JSON.parse(
  await readFile(
    resolve(homedir(), ".near-credentials/testnet", masterId + ".json"),
    "utf8",
  ),
);
const rpc = new JsonRpcProvider({ url: "https://test.rpc.fastnear.com" });
if ((await rpc.getNetworkId()) !== "testnet") throw new Error("Testnet only");
const master = new Account(masterId, rpc, credentials.private_key);
const directory = resolve(root, ".near-credentials");
await mkdir(directory, { recursive: true, mode: 0o700 });
const ids: Record<string, string> = {};
for (const [role, amount] of [
  ["contract", "2500000000000000000000000"],
  ["buyer", "1500000000000000000000000"],
  ["provider", "500000000000000000000000"],
] as const) {
  const id = `${role}.${masterId}`;
  ids[role] = id;
  const path = resolve(directory, role + ".json");
  let key: ReturnType<typeof KeyPair.fromRandom>;
  try {
    const saved = JSON.parse(await readFile(path, "utf8"));
    key = KeyPair.fromString(saved.private_key);
  } catch {
    try {
      await rpc.viewAccount({ accountId: id });
      throw new Error("EXISTING_ACCOUNT_WITHOUT_LOCAL_KEY");
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "EXISTING_ACCOUNT_WITHOUT_LOCAL_KEY"
      )
        throw error;
    }
    key = KeyPair.fromRandom("ed25519");
    await writeFile(
      path,
      JSON.stringify({
        account_id: id,
        private_key: key.toString(),
        public_key: key.getPublicKey().toString(),
      }),
      { mode: 0o600 },
    );
  }
  let exists = false;
  try {
    await rpc.viewAccount({ accountId: id });
    exists = true;
  } catch {}
  if (!exists)
    await master.signAndSendTransaction({
      receiverId: id,
      actions: [
        actions.createAccount(),
        actions.transfer(BigInt(amount)),
        actions.addFullAccessKey(key.getPublicKey()),
      ],
    });
  console.log(role, id, "ready");
  await chmod(path, 0o600);
}
const contractKeys = JSON.parse(
  await readFile(resolve(directory, "contract.json"), "utf8"),
);
const contract = new Account(ids["contract"]!, rpc, contractKeys.private_key);
const wasm = await readFile(
  resolve(root, "contracts-near/target/near/contracts_near.wasm"),
);
const state = await contract.getState();
if (state.codeHash === "11111111111111111111111111111111") {
  const result = await contract.signAndSendTransaction({
    receiverId: ids["contract"]!,
    actions: [
      actions.deployContract(wasm),
      actions.functionCall("new", {}, 30000000000000n, 0n),
    ],
  });
  console.log("Deployed testnet contract", ids["contract"]);
  await writeFile(
    resolve(root, "docs/testnet-deployment.json"),
    JSON.stringify(
      {
        network: "testnet",
        contract: ids["contract"],
        transaction: result.transaction.hash,
        explorer: `https://testnet.nearblocks.io/txns/${result.transaction.hash}`,
      },
      null,
      2,
    ) + "\n",
  );
} else {
  await rpc.callFunction({
    contractId: ids["contract"]!,
    method: "counters",
    args: {},
  });
  console.log("Contract already deployed and initialized; not replacing code");
}

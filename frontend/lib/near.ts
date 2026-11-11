import type { NearConnector } from "@hot-labs/near-connect";
let connection: NearConnector | undefined;
export async function connector() {
  if (!connection) {
    const { NearConnector } = await import("@hot-labs/near-connect");
    connection = new NearConnector({
      network: "testnet",
      features: { signMessage: true },
      autoConnect: false,
    });
  }
  return connection;
}
export async function wallet() {
  const c = await connector();
  try {
    return await c.wallet();
  } catch {
    return await c.connect();
  }
}
export async function api(path: string, body?: unknown, method?: string) {
  const r = await fetch("/api/near" + path, {
    credentials: "same-origin",
    ...(method ? {method} : {}),
    ...(body !== undefined
      ? {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const v = await r.json();
  if (!r.ok) throw new Error(v.error ?? `Request failed (${r.status})`);
  return v;
}
export async function view<T>(
  rpc: string,
  contract: string,
  method: string,
  args: object,
): Promise<T> {
  const r = await fetch(rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "accord",
      method: "query",
      params: {
        request_type: "call_function",
        finality: "final",
        account_id: contract,
        method_name: method,
        args_base64: btoa(JSON.stringify(args)),
      },
    }),
  });
  const v = await r.json();
  if (v.error) throw new Error("NEAR view unavailable");
  return JSON.parse(new TextDecoder().decode(new Uint8Array(v.result.result)));
}
export function canonical(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  return (
    "{" +
    Object.keys(v)
      .sort()
      .map(
        (k) =>
          JSON.stringify(k) +
          ":" +
          canonical((v as Record<string, unknown>)[k]),
      )
      .join(",") +
    "}"
  );
}
export async function digest(v: unknown) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(canonical(v)),
      ),
    ),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export function near(amount: string) {
  const value = BigInt(amount),
    n = 10n ** 24n;
  const fraction = (value % n).toString().padStart(24, "0").replace(/0+$/, "");
  return (value / n).toString() + (fraction ? "." + fraction : "");
}

export async function sendWalletTransaction(
  params: Parameters<
    Awaited<ReturnType<typeof wallet>>["signAndSendTransaction"]
  >[0],
) {
  const result = await (await wallet()).signAndSendTransaction(params);
  if (!result?.transaction?.hash)
    throw new Error(
      "Wallet submitted without a transaction reference. Recover the agreement before retrying.",
    );
  const confirmed = await api("/transactions/confirm", {
    hash: result.transaction.hash,
  });
  return { ...result, confirmedResult: confirmed.result };
}

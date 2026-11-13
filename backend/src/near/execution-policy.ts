/** Pure authorization: model text never supplies expected commercial terms. */
import type { Service, Subscription } from "./config.js";
import { digest } from "./core.js";
export function assertLimitedKey(permission: unknown, contract: string) {
  const p = permission as any;
  if (
    !p ||
    typeof p !== "object" ||
    !p.FunctionCall ||
    p.FunctionCall.receiver_id !== contract ||
    JSON.stringify(p.FunctionCall.method_names) !== '["charge"]' ||
    !/^\d+$/.test(String(p.FunctionCall.allowance)) ||
    BigInt(p.FunctionCall.allowance) <= 0n ||
    BigInt(p.FunctionCall.allowance) > 50000000000000000000000n
  )
    throw Error("Finite charge-only key required");
}
export function authorizeExecution(v: {
  id: string;
  owner: string;
  input: unknown;
  paused: boolean;
  approved_identity: string | null;
  identity: string;
  enabled: boolean;
  sub: Subscription;
  service: Service;
  metadata: unknown;
  cycle: number;
  receipt?: unknown;
  now?: bigint;
}) {
  if (v.sub.owner !== v.owner || digest(v.input) !== v.sub.input_hash)
    throw Error("Execution owner/input mismatch");
  if (digest(v.metadata) !== v.service.metadata_hash)
    throw Error("Execution service metadata mismatch");
  // Paid recovery preserves a finalized financial fact even after cancellation, expiry or pause.
  if (v.receipt) return;
  if (!v.enabled || v.paused)
    throw Error("Execution paused by owner or provider");
  if (v.approved_identity !== v.identity)
    throw Error(
      "Agent identity changed or unapproved; owner reapproval required",
    );
  const now = v.now ?? BigInt(Date.now()) * 1000000n;
  if (!v.sub.active) throw Error("Execution canceled");
  if (now >= BigInt(v.sub.expires_at_ns)) throw Error("Execution expired");
  if (now < BigInt(v.sub.next_due_ns)) throw Error("Execution not due");
  if (v.cycle !== v.sub.cycles || v.cycle >= v.sub.max_cycles || v.cycle < 0)
    throw Error("Execution cycle limit or duplicate");
  if (
    BigInt(v.sub.reserved) < BigInt(v.service.price) ||
    BigInt(v.service.price) <= 0n
  )
    throw Error("Execution spending limit");
}

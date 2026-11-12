import { spawn } from "node:child_process";

// Session advisory locks require a direct connection, not a transaction pooler.
if (process.env.DATABASE_URL_UNPOOLED) process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;

// One container preserves the immutable provider URL's private loopback topology.
const children = [
  spawn(process.execPath, ["--import", "tsx", "src/near/provider-server.ts"], {
    stdio: "inherit", env: { ...process.env, BIND_HOST: "127.0.0.1", PROVIDER_PORT: "4001" },
  }),
  spawn(process.execPath, ["--import", "tsx", "src/near/server.ts"], {
    stdio: "inherit", env: { ...process.env, HOSTED_API: "false", BIND_HOST: "0.0.0.0", PORT: "4000", RUN_WORKER: "true", RUN_OPERATIONS: "true" },
  }),
];
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill("SIGTERM");
  const timer = setTimeout(() => { for (const child of children) child.kill("SIGKILL"); }, 25000);
  timer.unref();
}
process.on("SIGTERM", () => stop(0));
process.on("SIGINT", () => stop(0));
for (const child of children) {
  child.on("error", () => stop(1));
  child.on("exit", code => { if (!stopping) stop(code || 1); });
}

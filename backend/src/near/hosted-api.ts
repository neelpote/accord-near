// HTTP instances can scale to zero; the single persistent dispatch container owns both loops.
process.env["RUN_WORKER"] = "false";
process.env["RUN_OPERATIONS"] = "false";
process.env["HOSTED_API"] = "true";
await import("./server.js");
export {};

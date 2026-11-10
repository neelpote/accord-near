import { db, migrate, migrateProvisioning } from "./db.js";
await migrate();
await migrateProvisioning();
await db.end();
console.log("Accord additive schema ready");

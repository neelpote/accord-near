import { db } from "./db.js";
export function groqConfigured() {
  const limit = Number(process.env["GROQ_MAX_REQUESTS"] ?? "0");
  return process.env["GROQ_ENABLED"] === "true" && !!process.env["GROQ_API_KEY"] && Number.isInteger(limit) && limit >= 1 && limit <= 100;
}
export async function reserveGroqRequest() {
  if (!groqConfigured()) throw Error("Configure Groq with an explicit request cap (1..100)");
  const reserved = await db.query("UPDATE accord_groq_budget SET requests=requests+1 WHERE id=1 AND requests<$1 RETURNING requests", [Number(process.env["GROQ_MAX_REQUESTS"])]);
  if (!reserved.rowCount) throw Error("Groq request cap reached; no automatic retry or top-up");
}

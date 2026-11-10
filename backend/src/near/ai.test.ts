import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAiReport } from "./ai.js";
test("AI output is bounded and invalid model JSON fails closed", () => {
  const valid = {
    risk_score: 80,
    risk_level: "high",
    summary: "Concentrated snapshot",
    findings: ["80% in one holding"],
    recommendations: [],
  };
  assert.deepEqual(parseAiReport(valid), valid);
  for (const value of [
    null,
    { ...valid, risk_score: 200 },
    { ...valid, findings: [{}] },
    { ...valid, recommendations: Array(13).fill("x") },
    { ...valid, summary: "x".repeat(2001) },
  ])
    assert.throws(() => parseAiReport(value));
});

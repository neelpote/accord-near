import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { digest } from "./core.js";
import {
  runReferenceAgent,
  cleanVendorDocument,
  poisonedVendorDocument,
  parseAgentPlan,
  referenceAgentSystem,
  referenceAgentTask,
} from "./causal-agent.js";
test("saved live causal evidence validates without inference or database access", async () => {
  const capture = JSON.parse(
    await readFile(
      new URL("../../../docs/causal-agent-responses.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(capture.system, referenceAgentSystem);
  assert.equal(capture.task, referenceAgentTask);
  assert.equal(capture.control.document, cleanVendorDocument);
  assert.equal(capture.attack.document, poisonedVendorDocument);
  for (const item of [capture.control, capture.attack]) {
    assert.equal(item.system_hash, digest(referenceAgentSystem));
    assert.equal(item.task_hash, digest(referenceAgentTask));
    assert.equal(item.document_hash, digest(item.document));
    assert.deepEqual(
      parseAgentPlan(JSON.parse(item.raw_content), item.document),
      item.plan,
    );
  }
  assert.equal(
    capture.control.plan.receiver_account_id,
    "provider.accord-dev-261110.testnet",
  );
  assert.equal(
    capture.attack.plan.receiver_account_id,
    "login.accord-dev-261110.testnet",
  );
});
test("causal planner changes only the low-trust tool document; reserves before independent calls", async () => {
  process.env.GROQ_API_KEY = "fixture-not-a-real-credential";
  process.env.GROQ_ENABLED = "true";
  const requests: any[] = [];
  let reserved = 0;
  const fake: typeof fetch = async (_url, init) => {
    assert.equal(reserved, requests.length + 1);
    const req = JSON.parse(String(init?.body));
    requests.push(req);
    const doc = req.messages[3].content;
    return Response.json({
      id: "fixture-completion",
      model: "fixture",
      choices: [
        {
          finish_reason: "stop",
          message: {
            content: JSON.stringify({
              action: "pay",
              receiver_account_id: "provider.accord-dev-261110.testnet",
              source_quote:
                "Settlement account: provider.accord-dev-261110.testnet",
              reason: "Fixture plan",
            }),
          },
        },
      ],
    });
  };
  const reserve = async () => {
    reserved++;
  };
  const a = await runReferenceAgent(cleanVendorDocument, fake, reserve),
    b = await runReferenceAgent(poisonedVendorDocument, fake, reserve);
  assert.equal(a.system_hash, b.system_hash);
  assert.equal(a.task_hash, b.task_hash);
  assert.notEqual(a.document_hash, b.document_hash);
  assert.deepEqual(
    requests[0].messages.slice(0, 3),
    requests[1].messages.slice(0, 3),
  );
  assert.equal(reserved, 2);
  assert.throws(() =>
    parseAgentPlan(
      {
        action: "pay",
        receiver_account_id: "evil.near",
        source_quote: "absent",
        reason: "x",
      },
      cleanVendorDocument,
    ),
  );
  await assert.rejects(
    runReferenceAgent(
      cleanVendorDocument,
      async () => Response.json({ error: "outage" }, { status: 503 }),
      reserve,
    ),
    /HTTP 503/,
  );
});

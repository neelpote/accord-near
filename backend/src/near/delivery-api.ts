import type { Express, Request } from "express";
import { db } from "./db.js";
import { view, type Service, type Subscription } from "./config.js";
export function mountDelivery(
  app: Express,
  owner: (r: Request) => Promise<string>,
) {
  app.get("/subscriptions/:id/cycles/:cycle/verification", async (req, res) => {
    const account = await owner(req),
      id = req.params.id,
      cycle = Number(req.params.cycle);
    if (!Number.isInteger(cycle) || cycle < 0 || cycle > 19)
      throw Error("Invalid delivery cycle");
    if (
      !(
        await db.query(
          "SELECT 1 FROM accord_subscriptions WHERE id=$1 AND owner=$2",
          [id, account],
        )
      ).rowCount
    )
      throw Error("Not agreement owner");
    const row = (
      await db.query(
        "SELECT state,verification,artifact_hash,receipt,delivered_at,acknowledged_at,payment_tx FROM accord_cycles WHERE subscription_id=$1 AND cycle=$2",
        [id, cycle],
      )
    ).rows[0];
    if (!row) throw Error("Unknown job");
    const history = (
      await db.query(
        "SELECT status,body,created_at FROM accord_delivery_events WHERE subscription_id=$1 AND cycle=$2 ORDER BY id",
        [id, cycle],
      )
    ).rows;
    const disputes = (
      await db.query(
        "SELECT actor,role,reason,created_at FROM accord_delivery_disputes WHERE subscription_id=$1 AND cycle=$2 ORDER BY id",
        [id, cycle],
      )
    ).rows;
    res.json({ ...row, job_id: `${id}:${cycle}`, history, disputes });
  });
  app.post("/subscriptions/:id/cycles/:cycle/feedback", async (req, res) => {
    const account = await owner(req),
      id = req.params.id,
      cycle = Number(req.params.cycle),
      action = req.body.action;
    if (
      !Number.isInteger(cycle) ||
      cycle < 0 ||
      cycle > 19 ||
      !["accept", "dispute", "respond"].includes(action)
    )
      throw Error("Invalid delivery action");
    const sub = await view<Subscription>("get_subscription", {
        subscription_id: id,
      }),
      service =
        sub &&
        (await view<Service>("get_service", { service_id: sub.service_id }));
    if (
      !sub ||
      !service ||
      (action === "respond"
        ? service.provider !== account
        : sub.owner !== account)
    )
      throw Error("Not authorized for this delivery");
    const row = (
      await db.query(
        "SELECT * FROM accord_cycles WHERE subscription_id=$1 AND cycle=$2",
        [id, cycle],
      )
    ).rows[0];
    if (!row || row.state !== "DELIVERED" || !row.receipt)
      throw Error("A delivered paid report is required");
    if (action === "accept") {
      if (row.verification?.status === "DISPUTED")
        throw Error("Acknowledgement cannot silently resolve a dispute");
      await db.query(
        "UPDATE accord_cycles SET acknowledged_at=COALESCE(acknowledged_at,now()) WHERE subscription_id=$1 AND cycle=$2",
        [id, cycle],
      );
      res.json({ acknowledged: true, financial_change: false });
      return;
    }
    const reason = req.body.reason;
    if (typeof reason !== "string" || !reason.trim() || reason.length > 2000)
      throw Error("Provide a bounded dispute statement");
    const c = await db.connect();
    try {
      await c.query("BEGIN");
      if (
        action === "respond" &&
        !(
          await c.query(
            "SELECT 1 FROM accord_delivery_disputes WHERE subscription_id=$1 AND cycle=$2 AND role='customer'",
            [id, cycle],
          )
        ).rowCount
      )
        throw Error("No customer dispute to respond to");
      await c.query(
        "INSERT INTO accord_delivery_disputes(subscription_id,cycle,actor,role,reason) VALUES($1,$2,$3,$4,$5)",
        [
          id,
          cycle,
          account,
          action === "respond" ? "provider" : "customer",
          reason.trim(),
        ],
      );
      if (action === "dispute") {
        await c.query(
          "UPDATE accord_cycles SET verification=COALESCE(verification,'{}'::jsonb)||'{\"status\":\"DISPUTED\"}'::jsonb WHERE subscription_id=$1 AND cycle=$2",
          [id, cycle],
        );
        await c.query(
          "INSERT INTO accord_delivery_events(owner,subscription_id,cycle,status,body) VALUES($1,$2,$3,'DISPUTED',$4)",
          [
            sub.owner,
            id,
            cycle,
            { reason: reason.trim(), financial_change: false },
          ],
        );
      }
      await c.query("COMMIT");
      res.json({
        recorded: true,
        status: "DISPUTED",
        financial_change: false,
        resolution: "Manual review; no automatic refund or clawback",
      });
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  });
}

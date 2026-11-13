import { db } from "./db.js";
export async function recordVerification(
  owner: string,
  id: string,
  cycle: number,
  verification: Record<string, unknown>,
) {
  const connection = await db.connect();
  try {
    await connection.query("BEGIN");
    const row = (
      await connection.query(
        "SELECT verification FROM accord_cycles WHERE subscription_id=$1 AND cycle=$2 FOR UPDATE",
        [id, cycle],
      )
    ).rows[0];
    const old = row?.verification;
    const rank: Record<string, number> = {
      PENDING: 0,
      STRUCTURE_VALID: 1,
      EVIDENCE_VALID: 2,
      DELIVERY_VERIFIED: 3,
    };
    if (
      old?.status === "DISPUTED" ||
      (rank[String(old?.status)] ?? -1) >
        (rank[String(verification.status)] ?? 99)
    ) {
      await connection.query("COMMIT");
      return;
    }
    await connection.query(
      "UPDATE accord_cycles SET verification=$3 WHERE subscription_id=$1 AND cycle=$2",
      [id, cycle, verification],
    );
    if (old?.status !== verification.status)
      await connection.query(
        "INSERT INTO accord_delivery_events(owner,subscription_id,cycle,status,body) VALUES($1,$2,$3,$4,$5)",
        [owner, id, cycle, verification.status, verification],
      );
    await connection.query("COMMIT");
  } catch (e) {
    await connection.query("ROLLBACK");
    throw e;
  } finally {
    connection.release();
  }
}

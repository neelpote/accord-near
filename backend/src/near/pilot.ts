export const pilotRoles = ["developer", "operator", "agency"] as const;
export const pilotStages = ["interested", "used", "declined", "accepted_terms"] as const;
export function shortText(value: unknown, label: string, max = 1000): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    throw Error(`${label} must contain 1..${max} characters`);
  return value.trim();
}
export function pilotFeedback(value: unknown) {
  const v = value as Record<string, unknown>;
  if (!v || !pilotRoles.includes(v.role as typeof pilotRoles[number]) || !pilotStages.includes(v.stage as typeof pilotStages[number])) throw Error("Choose a pilot role and stage");
  const terms = v.stage === "accepted_terms" ? shortText(v.terms, "Price, currency and period", 200) : "";
  return {role: v.role, stage: v.stage, problem: shortText(v.problem, "Actual monitoring need"), workaround: shortText(v.workaround, "Current workaround"), outcome: shortText(v.outcome, "Pilot outcome"), terms};
}
export function pilotSummary(rows: {body: ReturnType<typeof pilotFeedback>}[]) {
  return { entries: rows.length, used: rows.filter(r => ["used", "accepted_terms"].includes(String(r.body.stage))).length,
    accepted_terms: rows.filter(r => r.body.stage === "accepted_terms").length,
    demand_validated: false, gate: "Human verification of distinct teams and actual behavior is pending; self-reports are not revenue." };
}

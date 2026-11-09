import { getDb } from "./db";

export type BudgetState = {
  capEur: number;
  marginPct: number;
  fixedExpensesEur: number;
  otherExpensesEur: number;
  aiSpentEur: number;
  reservedEur: number;
  availableEur: number;
  periodStart: string;
  currency: string;
  fxRate: number;
  alerts: { threshold: number; reached: boolean };
  usageRatio: number;
};

export class BudgetError extends Error {
  constructor(message = "Budget IA insuffisant pour cette opération.") {
    super(message);
  }
}

function currentPeriodStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function getSettings() {
  const db = getDb();
  let row = db.prepare("SELECT * FROM budget_settings WHERE id = 1").get() as
    | {
        monthly_cap_eur: number;
        margin_pct: number;
        currency: string;
        fx_rate: number;
        period_start: string;
        alert_50: number;
        alert_80: number;
        alert_95: number;
      }
    | undefined;
  if (!row) {
    const start = currentPeriodStart();
    db.prepare(
      `INSERT INTO budget_settings (id, monthly_cap_eur, margin_pct, currency, fx_rate, period_start)
       VALUES (1, 10, 10, 'EUR', 1, ?)`,
    ).run(start);
    row = {
      monthly_cap_eur: 10,
      margin_pct: 10,
      currency: "EUR",
      fx_rate: 1,
      period_start: start,
      alert_50: 1,
      alert_80: 1,
      alert_95: 1,
    };
  }
  return row;
}

export function getBudgetState(): BudgetState {
  const db = getDb();
  const s = getSettings();

  const fixed = db
    .prepare("SELECT COALESCE(SUM(amount_eur), 0) AS n FROM budget_expenses WHERE category = 'fixe'")
    .get() as { n: number };
  const other = db
    .prepare("SELECT COALESCE(SUM(amount_eur), 0) AS n FROM budget_expenses WHERE category IN ('autre','dev')")
    .get() as { n: number };

  const spent = db
    .prepare("SELECT COALESCE(SUM(cost_eur), 0) AS n FROM ai_usage WHERE datetime(created_at) >= datetime(?)")
    .get(s.period_start) as { n: number };
  const reserved = db
    .prepare("SELECT COALESCE(SUM(reserved_eur), 0) AS n FROM ai_reservations WHERE status = 'reserved'")
    .get() as { n: number };

  const margin = s.monthly_cap_eur * (s.margin_pct / 100);
  const available = Math.max(
    0,
    s.monthly_cap_eur - fixed.n - other.n - spent.n - reserved.n - margin,
  );
  const usageRatio = s.monthly_cap_eur > 0 ? (spent.n + reserved.n) / s.monthly_cap_eur : 0;

  return {
    capEur: s.monthly_cap_eur,
    marginPct: s.margin_pct,
    fixedExpensesEur: fixed.n,
    otherExpensesEur: other.n,
    aiSpentEur: spent.n,
    reservedEur: reserved.n,
    availableEur: available,
    periodStart: s.period_start,
    currency: s.currency,
    fxRate: s.fx_rate,
    alerts: {
      threshold: usageRatio >= 0.95 ? 95 : usageRatio >= 0.8 ? 80 : usageRatio >= 0.5 ? 50 : 0,
      reached: usageRatio >= 0.5,
    },
    usageRatio,
  };
}

export function reserveCost(userId: number | null, operation: string, maxCostEur: number): number {
  const db = getDb();
  const run = db.transaction(() => {
    const state = getBudgetState();
    if (maxCostEur > state.availableEur) {
      throw new BudgetError(
        `Budget IA insuffisant : ${maxCostEur.toFixed(4)} € requis, ${state.availableEur.toFixed(4)} € disponible.`,
      );
    }
    const res = db
      .prepare("INSERT INTO ai_reservations (user_id, operation, reserved_eur) VALUES (?, ?, ?)")
      .run(userId, operation, maxCostEur);
    return Number(res.lastInsertRowid);
  });
  return run.immediate();
}

export function settleCost(params: {
  reservationId: number;
  userId: number | null;
  courseId: number | null;
  operation: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costEur: number;
}) {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare(
      "UPDATE ai_reservations SET status = 'settled', settled_at = datetime('now') WHERE id = ?",
    ).run(params.reservationId);
    db.prepare(
      `INSERT INTO ai_usage (user_id, course_id, operation, provider, model, input_tokens, output_tokens, cost_eur, estimated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    ).run(
      params.userId,
      params.courseId,
      params.operation,
      params.provider,
      params.model,
      params.inputTokens,
      params.outputTokens,
      params.costEur,
    );
  });
  tx();
}

export function failReservation(reservationId: number, billable: boolean, params?: {
  userId: number | null;
  courseId: number | null;
  operation: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costEur: number;
}) {
  const db = getDb();
  const tx = db.transaction(() => {
    if (billable && params) {
      db.prepare(
        "UPDATE ai_reservations SET status = 'settled', settled_at = datetime('now') WHERE id = ?",
      ).run(reservationId);
      db.prepare(
        `INSERT INTO ai_usage (user_id, course_id, operation, provider, model, input_tokens, output_tokens, cost_eur, estimated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      ).run(
        params.userId,
        params.courseId,
        params.operation,
        params.provider,
        params.model,
        params.inputTokens,
        params.outputTokens,
        params.costEur,
      );
    } else {
      db.prepare("UPDATE ai_reservations SET status = 'released' WHERE id = ?").run(reservationId);
    }
  });
  tx();
}

export function estimateMaxCost(inputTokens: number, outputTokens: number, priceIn: number, priceOut: number): number {
  return (inputTokens / 1_000_000) * priceIn + (outputTokens / 1_000_000) * priceOut;
}

export function estimateTokensFromText(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

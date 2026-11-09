import { getDb } from "@/lib/db";

export type BudgetSettings = {
  monthly_cap_eur: number;
  margin_pct: number;
  currency: string;
  fx_rate: number;
  period_start: string;
  alert_50: number;
  alert_80: number;
  alert_95: number;
};

export function getSettings(): BudgetSettings {
  const db = getDb();
  let row = db.prepare("SELECT * FROM budget_settings WHERE id = 1").get() as BudgetSettings | undefined;
  if (!row) {
    const start = new Date().toISOString().slice(0, 7) + "-01";
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

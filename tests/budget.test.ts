import { describe, it, expect, beforeEach } from "vitest";
import { getDb } from "@/lib/db";
import { getBudgetState, reserveCost, settleCost, BudgetError } from "@/lib/budget";

const db = () => getDb();

beforeEach(() => {
  db().exec("DELETE FROM ai_usage; DELETE FROM ai_reservations; DELETE FROM budget_expenses; DELETE FROM budget_settings;");
  db().prepare(
    "INSERT INTO budget_settings (id, monthly_cap_eur, margin_pct, currency, fx_rate, period_start) VALUES (1, 1, 0, 'EUR', 1, ?)",
  ).run(new Date().toISOString().slice(0, 7) + "-01");
});

describe("contrôle budgétaire IA", () => {
  it("réserve, réconcilie et bloque si insuffisant", () => {
    const r1 = reserveCost(null, "chat", 0.6);
    expect(getBudgetState().reservedEur).toBeCloseTo(0.6, 5);
    expect(() => reserveCost(null, "chat", 0.6)).toThrow(BudgetError);

    settleCost({
      reservationId: r1,
      userId: null,
      courseId: null,
      operation: "chat",
      provider: "test",
      model: "test",
      inputTokens: 100,
      outputTokens: 50,
      costEur: 0.5,
    });
    const state = getBudgetState();
    expect(state.aiSpentEur).toBeCloseTo(0.5, 5);
    expect(state.reservedEur).toBeCloseTo(0, 5);
    expect(state.availableEur).toBeCloseTo(0.5, 5);
    expect(() => reserveCost(null, "chat", 0.4)).not.toThrow();
  });

  it("tient compte des dépenses fixes et de la marge de sécurité", () => {
    db().prepare("DELETE FROM budget_settings").run();
    db().prepare(
      "INSERT INTO budget_settings (id, monthly_cap_eur, margin_pct, currency, fx_rate, period_start) VALUES (1, 10, 10, 'EUR', 1, ?)",
    ).run(new Date().toISOString().slice(0, 7) + "-01");
    db().prepare("INSERT INTO budget_expenses (label, amount_eur, category) VALUES ('VPS', 2, 'fixe')").run();
    db().prepare("INSERT INTO budget_expenses (label, amount_eur, category) VALUES ('Divers', 1, 'autre')").run();
    const state = getBudgetState();
    expect(state.fixedExpensesEur).toBe(2);
    expect(state.otherExpensesEur).toBe(1);
    expect(state.availableEur).toBeCloseTo(10 - 2 - 1 - 1, 5);
  });
});

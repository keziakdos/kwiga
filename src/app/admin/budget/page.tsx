import { getDb } from "@/lib/db";
import { getBudgetState } from "@/lib/budget";
import { getSettings } from "@/lib/settings";
import { BudgetSettingsForm, ExpenseForm } from "@/components/admin/BudgetForms";
import { deleteExpenseAction } from "@/app/actions/admin";
import { Badge, ProgressBar, SectionTitle, StatCard } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Budget — Administration" };

export default function AdminBudgetPage() {
  const db = getDb();
  const budget = getBudgetState();
  const s = getSettings();
  const expenses = db.prepare("SELECT * FROM budget_expenses ORDER BY id DESC").all() as Array<Record<string, unknown>>;
  const usage = db
    .prepare(
      `SELECT provider, model, operation, COUNT(*) AS calls, SUM(input_tokens) AS tin, SUM(output_tokens) AS tout,
              SUM(cost_eur) AS cost
       FROM ai_usage WHERE datetime(created_at) >= datetime(?) GROUP BY provider, model, operation ORDER BY cost DESC`,
    )
    .all(budget.periodStart) as Array<Record<string, unknown>>;
  const totalCalls = usage.reduce((n, u) => n + Number(u.calls), 0);
  const totalTokens = usage.reduce((n, u) => n + Number(u.tin) + Number(u.tout), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Budget & coûts IA</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Estimation locale. Ce n&apos;est pas un solde bancaire ni un crédit fournisseur vérifié.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Plafond" value={`${budget.capEur.toFixed(2)} €`} />
        <StatCard label="Dépenses fixes + autres" value={`${(budget.fixedExpensesEur + budget.otherExpensesEur).toFixed(2)} €`} tone="slate" />
        <StatCard label="IA consommée" value={`${budget.aiSpentEur.toFixed(3)} €`} hint={`${totalCalls} appels`} tone="yellow" />
        <StatCard label="Disponible IA" value={`${budget.availableEur.toFixed(2)} €`} hint={`marge ${budget.marginPct} % déduite`} tone={budget.availableEur <= 0 ? "coral" : "board"} />
      </div>

      <section className="card p-6">
        <SectionTitle>Consommation de la période</SectionTitle>
        <ProgressBar value={budget.usageRatio} tone={budget.usageRatio >= 0.95 ? "coral" : budget.usageRatio >= 0.8 ? "yellow" : "board"} label="Part du plafond consommée" />
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tone="neutral">Période depuis le {new Date(budget.periodStart).toLocaleDateString("fr-FR")}</Badge>
          <Badge tone="neutral">{totalTokens.toLocaleString("fr-FR")} tokens</Badge>
          <Badge tone={budget.usageRatio * 100 >= 95 ? "coral" : budget.usageRatio * 100 >= 80 ? "yellow" : "green"}>
            Alertes 50/80/95 %
          </Badge>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          Formule : disponible = plafond − dépenses fixes − autres dépenses − coût IA − réservations −
          marge. Les réservations sont créées avant chaque appel puis réconciliées après réception des
          tokens. La facture réelle du fournisseur peut différer.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <SectionTitle>Paramètres du budget</SectionTitle>
          <BudgetSettingsForm
            cap={s.monthly_cap_eur}
            margin={s.margin_pct}
            currency={s.currency}
            fxRate={s.fx_rate}
            periodStart={s.period_start}
          />
        </section>
        <section className="card p-6">
          <SectionTitle>Ajouter une dépense</SectionTitle>
          <ExpenseForm />
        </section>
      </div>

      <section className="card p-6">
        <SectionTitle>Dépenses enregistrées</SectionTitle>
        {expenses.length === 0 ? (
          <p className="text-sm text-ink-soft">Aucune dépense enregistrée.</p>
        ) : (
          <ul className="divide-y divide-ink/5">
            {expenses.map((e) => (
              <li key={String(e.id)} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="text-ink">{String(e.label)}</span>
                <span className="flex items-center gap-3">
                  <Badge tone={e.category === "fixe" ? "slate" : "neutral"}>{String(e.category)}</Badge>
                  <span className="tabular-nums text-ink-soft">{Number(e.amount_eur).toFixed(2)} €</span>
                  <form action={deleteExpenseAction}>
                    <input type="hidden" name="expense_id" value={String(e.id)} />
                    <button type="submit" className="text-xs text-ink-faint hover:text-[#a33c22]">Supprimer</button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-ink-faint">
          Les dépenses fixes et autres réduisent le budget IA disponible. Le coût de développement
          (catégorie « dev ») est suivi séparément du plafond IA.
        </p>
      </section>

      <section className="card p-6">
        <SectionTitle>Détail des appels IA (période)</SectionTitle>
        {usage.length === 0 ? (
          <p className="text-sm text-ink-soft">Aucun appel IA enregistré sur la période.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink-faint">
                <tr>
                  <th className="py-2 pr-4">Opération</th>
                  <th className="py-2 pr-4">Fournisseur / modèle</th>
                  <th className="py-2 pr-4 text-right">Appels</th>
                  <th className="py-2 pr-4 text-right">Tokens</th>
                  <th className="py-2 text-right">Coût (€)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {usage.map((u, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-4 text-ink">{String(u.operation)}</td>
                    <td className="py-2 pr-4 text-ink-soft">{String(u.provider)} · {String(u.model)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{Number(u.calls)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{Number(u.tin) + Number(u.tout)}</td>
                    <td className="py-2 text-right tabular-nums">{Number(u.cost).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

import Link from "next/link";
import { getDb } from "@/lib/db";
import { getBudgetState } from "@/lib/budget";
import { aiConfigured } from "@/lib/ai";
import { config } from "@/lib/config";
import { StatCard, ProgressBar, SectionTitle, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administration — Kwiga" };

export default function AdminHome() {
  const db = getDb();
  const users = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  const activeUsers = db.prepare("SELECT COUNT(*) AS n FROM users WHERE status = 'active'").get() as { n: number };
  const courses = db.prepare("SELECT COUNT(*) AS n FROM courses WHERE status != 'archived'").get() as { n: number };
  const docs = db.prepare("SELECT COUNT(*) AS n FROM documents").get() as { n: number };
  const errors = db.prepare("SELECT COUNT(*) AS n FROM error_logs").get() as { n: number };
  const budget = getBudgetState();
  const audit = db
    .prepare(
      `SELECT a.*, u.username FROM admin_audit_log a LEFT JOIN users u ON u.id = a.admin_id
       ORDER BY a.id DESC LIMIT 6`,
    )
    .all() as Array<Record<string, unknown>>;
  const recentErrors = db
    .prepare("SELECT message, created_at FROM error_logs ORDER BY id DESC LIMIT 4")
    .all() as Array<Record<string, unknown>>;

  const usagePct = budget.capEur > 0 ? (budget.aiSpentEur / budget.capEur) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Vue d&apos;ensemble</h1>
        <p className="mt-1 text-sm text-ink-soft">Administration de Kwiga. Aucun contenu privé n&apos;est affiché ici par défaut.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Utilisateurs" value={`${activeUsers.n} / ${users.n}`} hint="actifs / total" />
        <StatCard label="Parcours actifs" value={String(courses.n)} hint="hors archives" tone="slate" />
        <StatCard label="Documents" value={String(docs.n)} hint="PDF et notes" tone="yellow" />
        <StatCard label="Erreurs" value={String(errors.n)} hint="journal technique" tone={errors.n > 0 ? "coral" : "board"} />
      </div>

      <section className="card p-6">
        <SectionTitle action={<Link href="/admin/budget" className="text-sm text-board-deep hover:underline">Gérer le budget</Link>}>
          Budget du mois
        </SectionTitle>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-3xl font-display text-ink">{budget.availableEur.toFixed(2)} €</p>
            <p className="text-xs text-ink-faint">Disponible pour l&apos;IA (estimation, hors marge de {budget.marginPct} % déjà déduite)</p>
          </div>
          <div className="text-right text-xs text-ink-soft">
            <p>Plafond : {budget.capEur.toFixed(2)} €</p>
            <p>Dépenses fixes : {budget.fixedExpensesEur.toFixed(2)} €</p>
            <p>Autres : {budget.otherExpensesEur.toFixed(2)} €</p>
            <p>IA consommée : {budget.aiSpentEur.toFixed(3)} €</p>
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar value={usagePct} tone={usagePct >= 0.95 ? "coral" : usagePct >= 0.8 ? "yellow" : "board"} label="Consommation IA (estimation)" />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[50, 80, 95].map((t) => (
            <Badge key={t} tone={usagePct * 100 >= t ? "coral" : "neutral"}>
              Alerte {t} % {usagePct * 100 >= t ? "atteinte" : "non atteinte"}
            </Badge>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <SectionTitle>État des services</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-ink/10 bg-white p-4 text-sm">
            <p className="font-medium text-ink">Tuteur IA</p>
            <p className="mt-1 text-xs text-ink-soft">
              {aiConfigured() ? (
                <>Configuré : {config.ai.provider} · {config.ai.model}</>
              ) : (
                <>Non configuré — aucune clé ni fournisseur actif. Les cours restent accessibles.</>
              )}
            </p>
          </div>
          <div className="rounded-xl border border-ink/10 bg-white p-4 text-sm">
            <p className="font-medium text-ink">Stockage</p>
            <p className="mt-1 text-xs text-ink-soft">Base SQLite + fichiers privés sur volume dédié. Aucune exposition publique.</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <SectionTitle action={<Link href="/admin/journal" className="text-sm text-board-deep hover:underline">Tout voir</Link>}>
            Dernières actions admin
          </SectionTitle>
          {audit.length === 0 ? (
            <p className="text-sm text-ink-soft">Aucune action enregistrée.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {audit.map((a) => (
                <li key={String(a.id)} className="rounded-xl border border-ink/10 bg-white px-3.5 py-2.5">
                  <p className="text-ink">{String(a.action)}</p>
                  <p className="text-xs text-ink-faint">
                    {String(a.username ?? "système")} · {String(a.detail ?? "")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-6">
          <SectionTitle action={<Link href="/admin/erreurs" className="text-sm text-board-deep hover:underline">Tout voir</Link>}>
            Dernières erreurs
          </SectionTitle>
          {recentErrors.length === 0 ? (
            <p className="text-sm text-ink-soft">Aucune erreur récente.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recentErrors.map((e, i) => (
                <li key={i} className="rounded-xl border border-accent-coral/20 bg-white px-3.5 py-2.5 text-xs text-ink-soft">
                  {String(e.message)}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

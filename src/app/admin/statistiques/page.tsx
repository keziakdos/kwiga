import { getDb } from "@/lib/db";
import { StatCard, SectionTitle } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Statistiques — Administration" };

export default function AdminStatsPage() {
  const db = getDb();
  const users = db.prepare("SELECT status, COUNT(*) AS n FROM users GROUP BY status").all() as Array<{ status: string; n: number }>;
  const coursesByDomain = db
    .prepare("SELECT domain, status, COUNT(*) AS n FROM courses GROUP BY domain, status")
    .all() as Array<{ domain: string; status: string; n: number }>;
  const docs = db.prepare("SELECT status, COUNT(*) AS n FROM documents GROUP BY status").all() as Array<{ status: string; n: number }>;
  const attempts = db.prepare("SELECT COUNT(*) AS n, COALESCE(AVG(score / NULLIF(max_score,0)),0) AS avg FROM exercise_attempts").get() as { n: number; avg: number };
  const messages = db.prepare("SELECT COUNT(*) AS n FROM chat_messages WHERE role = 'assistant'").get() as { n: number };
  const aiCalls = db.prepare("SELECT COUNT(*) AS n FROM ai_usage").get() as { n: number };
  const storage = db.prepare("SELECT COALESCE(SUM(size_bytes),0) AS n FROM documents").get() as { n: number };

  const sum = (rows: Array<{ n: number }>) => rows.reduce((a, r) => a + r.n, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Statistiques d&apos;usage</h1>
        <p className="mt-1 text-sm text-ink-soft">Agrégats uniquement. Aucun document ni conversation privée n&apos;est exposé.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Utilisateurs" value={String(sum(users))} />
        <StatCard label="Parcours" value={String(sum(coursesByDomain))} tone="slate" />
        <StatCard label="Tentatives d'exercices" value={String(attempts.n)} hint={`score moyen ${Math.round(attempts.avg * 100)} %`} tone="yellow" />
        <StatCard label="Réponses du tuteur" value={String(messages.n)} hint={`${aiCalls.n} appels IA au total`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <SectionTitle>Comptes par statut</SectionTitle>
          <ul className="divide-y divide-ink/5 text-sm">
            {users.map((u) => (
              <li key={u.status} className="flex justify-between py-2">
                <span className="text-ink-soft">{u.status === "active" ? "Actifs" : "Suspendus"}</span>
                <span className="font-medium tabular-nums text-ink">{u.n}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-6">
          <SectionTitle>Documents par état de traitement</SectionTitle>
          <ul className="divide-y divide-ink/5 text-sm">
            {docs.map((d) => (
              <li key={d.status} className="flex justify-between py-2">
                <span className="text-ink-soft">{d.status}</span>
                <span className="font-medium tabular-nums text-ink">{d.n}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-faint">
            Volume de fichiers : {(storage.n / (1024 * 1024)).toFixed(1)} Mo.
          </p>
        </section>

        <section className="card p-6 lg:col-span-2">
          <SectionTitle>Parcours par domaine et statut</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink-faint">
                <tr>
                  <th className="py-2 pr-4">Domaine</th>
                  <th className="py-2 pr-4">Statut</th>
                  <th className="py-2 text-right">Nombre</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {coursesByDomain.map((c, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-4 text-ink">{c.domain}</td>
                    <td className="py-2 pr-4 text-ink-soft">{c.status}</td>
                    <td className="py-2 text-right tabular-nums">{c.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

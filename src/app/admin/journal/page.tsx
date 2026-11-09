import { getDb } from "@/lib/db";
import { SectionTitle } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Journal admin — Administration" };

export default function AdminAuditPage() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT a.*, u.username FROM admin_audit_log a LEFT JOIN users u ON u.id = a.admin_id
       ORDER BY a.id DESC LIMIT 300`,
    )
    .all() as Array<Record<string, unknown>>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Journal des actions administratives</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Traçabilité des actions sensibles. Les accès justifiés au contenu privé doivent être journalisés.
        </p>
      </div>

      <section className="card p-6">
        <SectionTitle>{rows.length} action(s)</SectionTitle>
        {rows.length === 0 ? (
          <p className="text-sm text-ink-soft">Aucune action enregistrée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-ink-faint">
                <tr>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Administrateur</th>
                  <th className="py-2 pr-4">Action</th>
                  <th className="py-2 pr-4">Cible</th>
                  <th className="py-2">Détail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {rows.map((r) => (
                  <tr key={String(r.id)}>
                    <td className="whitespace-nowrap py-2 pr-4 text-ink-faint">
                      {new Date(String(r.created_at)).toLocaleString("fr-FR")}
                    </td>
                    <td className="py-2 pr-4 text-ink-soft">{String(r.username ?? "système")}</td>
                    <td className="py-2 pr-4 text-ink">{String(r.action)}</td>
                    <td className="py-2 pr-4 text-ink-faint">
                      {String(r.target_type ?? "")} {String(r.target_id ?? "")}
                    </td>
                    <td className="py-2 text-ink-soft">{String(r.detail ?? "")}</td>
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

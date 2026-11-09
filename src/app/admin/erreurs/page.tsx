import { getDb } from "@/lib/db";
import { SectionTitle, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Erreurs — Administration" };

export default function AdminErrorsPage() {
  const db = getDb();
  const errors = db
    .prepare("SELECT * FROM error_logs ORDER BY id DESC LIMIT 200")
    .all() as Array<Record<string, unknown>>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Journal des erreurs</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Erreurs techniques. Aucun secret, mot de passe ni contenu privé n&apos;est journalisé.
        </p>
      </div>

      <section className="card p-6">
        <SectionTitle>{errors.length} entrée(s)</SectionTitle>
        {errors.length === 0 ? (
          <p className="text-sm text-ink-soft">Aucune erreur enregistrée.</p>
        ) : (
          <ul className="space-y-2">
            {errors.map((e) => (
              <li key={String(e.id)} className="rounded-xl border border-ink/10 bg-white px-3.5 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge tone={String(e.level) === "error" ? "coral" : "yellow"}>{String(e.level)}</Badge>
                  <span className="text-xs text-ink-faint">{new Date(String(e.created_at)).toLocaleString("fr-FR")}</span>
                </div>
                <p className="mt-1.5 text-sm text-ink">{String(e.message)}</p>
                {e.context_json ? (
                  <details className="mt-1 text-xs text-ink-faint">
                    <summary className="cursor-pointer">Contexte</summary>
                    <pre className="mt-1 overflow-x-auto rounded-lg bg-ink/5 p-2">{String(e.context_json)}</pre>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

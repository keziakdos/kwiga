import { getDb } from "@/lib/db";
import { addExampleDocumentAction, deleteExampleDocumentAction } from "@/app/actions/admin";
import { ExampleDocumentForm } from "@/components/admin/ExampleForm";
import { SectionTitle, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Documents d'exemple — Administration" };

export default function AdminExamplesPage() {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM example_documents ORDER BY id DESC").all() as Array<Record<string, unknown>>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Documents d&apos;exemple</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Bibliothèque de références réseau proposées par l&apos;administrateur. Les apprenants
          n&apos;accèdent qu&apos;à leurs propres documents pour la génération de cours.
        </p>
      </div>

      <section className="card p-6">
        <SectionTitle>Ajouter une référence</SectionTitle>
        <ExampleDocumentForm />
      </section>

      <section className="card p-6">
        <SectionTitle>Références ({rows.length})</SectionTitle>
        {rows.length === 0 ? (
          <p className="text-sm text-ink-soft">Aucune référence enregistrée.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={String(r.id)} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-ink/10 bg-white px-3.5 py-3">
                <div>
                  <p className="font-medium text-ink">{String(r.title)}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge tone="green">{String(r.domain)}</Badge>
                    {r.url ? (
                      <a href={String(r.url)} target="_blank" rel="noopener noreferrer" className="text-xs text-board-deep underline">
                        Lien externe
                      </a>
                    ) : null}
                  </div>
                  {r.description ? <p className="mt-1 text-xs text-ink-soft">{String(r.description)}</p> : null}
                </div>
                <form action={deleteExampleDocumentAction}>
                  <input type="hidden" name="example_id" value={String(r.id)} />
                  <button type="submit" className="text-xs text-ink-faint hover:text-[#a33c22]">Supprimer</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

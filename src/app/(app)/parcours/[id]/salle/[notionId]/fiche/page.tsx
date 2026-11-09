import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getDb } from "@/lib/db";
import { getCourseForUser } from "@/lib/courses";
import { Diagram } from "@/components/Diagram";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function FichePage({ params }: { params: Promise<{ id: string; notionId: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/connexion");
  const { id, notionId } = await params;
  const courseId = Number(id);
  const course = getCourseForUser(courseId, user.id);
  if (!course) notFound();
  const db = getDb();
  const notion = db
    .prepare("SELECT * FROM notions WHERE id = ? AND course_id = ?")
    .get(Number(notionId), courseId) as Record<string, unknown> | undefined;
  if (!notion) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/parcours/${courseId}/salle/${notionId}`} className="text-sm text-ink-soft hover:text-ink">
          ← Retour à la notion
        </Link>
        <PrintButton />
      </div>

      <article className="paper-surface rounded-3xl border border-paper-line p-8 shadow-card print:border-0 print:shadow-none">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-faint">Fiche visuelle — {String(course.title)}</p>
        <h1 className="mt-2 font-display text-3xl text-ink">{String(notion.title)}</h1>

        {notion.summary ? (
          <section className="mt-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-board-deep">Résumé</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{String(notion.summary)}</p>
          </section>
        ) : null}

        {notion.explanation ? (
          <section className="mt-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-board-deep">Points clés</h2>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{String(notion.explanation)}</p>
          </section>
        ) : null}

        {notion.example ? (
          <section className="mt-4 rounded-xl border border-accent-coral/30 bg-white/70 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-[#a33c22]">Exemple</h2>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{String(notion.example)}</p>
          </section>
        ) : null}

        {notion.diagram ? (
          <section className="mt-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-board-deep">Schéma</h2>
            <div className="mt-2">
              <Diagram code={String(notion.diagram)} />
            </div>
          </section>
        ) : null}

        <p className="mt-6 border-t border-paper-line pt-4 text-[11px] leading-relaxed text-ink-faint">
          Fiche générée à partir du contenu du parcours. Kwiga est un outil pédagogique privé ; cette
          fiche ne constitue pas une certification officielle.
        </p>
      </article>
    </div>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getDb } from "@/lib/db";
import { getCourseForUser } from "@/lib/courses";

export const dynamic = "force-dynamic";

export default async function DocumentViewerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; docId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/connexion");
  const { id, docId } = await params;
  const courseId = Number(id);
  const course = getCourseForUser(courseId, user.id);
  if (!course) notFound();

  const db = getDb();
  const doc = db
    .prepare("SELECT * FROM documents WHERE id = ? AND course_id = ? AND user_id = ?")
    .get(Number(docId), courseId, user.id) as Record<string, unknown> | undefined;
  if (!doc) notFound();

  const sp = await searchParams;
  const requested = Number(sp.page);
  const pageRow = db
    .prepare("SELECT page_number, content FROM document_pages WHERE document_id = ? AND page_number = ?")
    .get(Number(docId), Number.isFinite(requested) ? requested : 1) as
    | { page_number: number; content: string }
    | undefined;

  const pages = db
    .prepare("SELECT page_number FROM document_pages WHERE document_id = ? ORDER BY page_number")
    .all(Number(docId)) as Array<{ page_number: number }>;

  const current = pageRow?.page_number ?? pages[0]?.page_number ?? 1;
  const pageContent = pageRow?.content ?? "";

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/parcours/${courseId}`} className="text-sm text-ink-soft hover:text-ink">
        ← Retour au parcours
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-ink">{String(doc.original_name)}</h1>
        <a
          className="btn-ghost px-3 py-1.5 text-xs"
          href={`/api/documents/${doc.id}/file`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Ouvrir le fichier original
        </a>
      </div>

      <div className="card mt-5 p-6">
        {pages.length === 0 ? (
          <p className="text-sm text-ink-soft">Aucune page extraite (document en cours de traitement ou notes).</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-ink/10 pb-3">
              <p className="text-sm text-ink-soft">
                Page {current} / {pages.length}
              </p>
              <div className="flex gap-2 text-xs">
                {current > 1 ? (
                  <Link className="btn-ghost px-2.5 py-1" href={`/parcours/${courseId}/documents/${doc.id}?page=${current - 1}`}>
                    ← Précédente
                  </Link>
                ) : null}
                {current < pages.length ? (
                  <Link className="btn-ghost px-2.5 py-1" href={`/parcours/${courseId}/documents/${doc.id}?page=${current + 1}`}>
                    Suivante →
                  </Link>
                ) : null}
              </div>
            </div>
            {doc.kind === "pdf" ? (
              <div className="mt-4 overflow-hidden rounded-xl border border-ink/10 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/documents/${doc.id}/page-image?page=${current}`}
                  alt={`${String(doc.original_name)} — page ${current}`}
                  className="w-full"
                />
              </div>
            ) : null}
            <article className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
              {pageContent || "Page vide ou sans texte exploitable."}
            </article>
          </>
        )}
      </div>
      <p className="mt-3 text-xs text-ink-faint">
        Texte extrait du document source. Les citations du tuteur renvoient à cette pagination réelle.
      </p>
    </div>
  );
}

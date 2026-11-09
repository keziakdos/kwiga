import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getDb } from "@/lib/db";
import { getCourseForUser } from "@/lib/courses";
import { searchChunks } from "@/lib/rag";
import { aiConfigured } from "@/lib/ai";
import { Diagram } from "@/components/Diagram";
import { NetworkAnimation } from "@/components/NetworkAnimation";
import { ZoomableImage } from "@/components/ZoomableImage";
import { ClassroomLayout } from "@/components/ClassroomLayout";
import { TutorChat } from "@/components/TutorChat";
import { NoteEditor } from "@/components/NoteEditor";
import { markNotionAction } from "@/app/actions/notes";
import { generateFicheAction } from "@/app/actions/fiche";
import { getSavedFiche } from "@/lib/fiche";
import { Badge } from "@/components/ui";
import { statusLabel } from "@/lib/validation";

export const dynamic = "force-dynamic";

export default async function ClassroomPage({
  params,
}: {
  params: Promise<{ id: string; notionId: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/connexion");
  const { id, notionId } = await params;
  const courseId = Number(id);
  const nId = Number(notionId);
  const course = getCourseForUser(courseId, user.id);
  if (!course) notFound();

  const db = getDb();
  const notion = db
    .prepare(
      `SELECT n.*, m.title AS module_title FROM notions n LEFT JOIN modules m ON m.id = n.module_id
       WHERE n.id = ? AND n.course_id = ?`,
    )
    .get(nId, courseId) as Record<string, unknown> | undefined;
  if (!notion) notFound();

  db.prepare("UPDATE courses SET current_notion_id = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?").run(
    nId,
    courseId,
    user.id,
  );

  const allNotions = db
    .prepare(
      `SELECT n.id, n.title, n.module_id, m.title AS module_title FROM notions n
       LEFT JOIN modules m ON m.id = n.module_id WHERE n.course_id = ? ORDER BY n.ord`,
    )
    .all(courseId) as Array<{ id: number; title: string; module_id: number | null; module_title: string | null }>;

  const progressRows = db
    .prepare(
      `SELECT np.notion_id, np.status FROM notion_progress np JOIN notions n ON n.id = np.notion_id
       WHERE np.user_id = ? AND n.course_id = ?`,
    )
    .all(user.id, courseId) as Array<{ notion_id: number; status: string }>;
  const statusMap = new Map(progressRows.map((r) => [r.notion_id, r.status]));
  const currentStatus = statusMap.get(nId) ?? "non_commence";

  const noteRow = db
    .prepare("SELECT content FROM notion_notes WHERE user_id = ? AND notion_id = ?")
    .get(user.id, nId) as { content: string } | undefined;

  const attemptCount = db
    .prepare(
      `SELECT COUNT(*) AS n FROM exercise_attempts ea
       JOIN exercises e ON e.id = ea.exercise_id
       WHERE ea.user_id = ? AND e.notion_id = ?`,
    )
    .get(user.id, nId) as { n: number };

  const chatMessages = (
    db
      .prepare(
        `SELECT role, content, sources_json FROM chat_messages
         WHERE thread_id IN (SELECT id FROM chat_threads WHERE user_id = ? AND course_id = ? AND (notion_id IS ?))
         ORDER BY id LIMIT 40`,
      )
      .all(user.id, courseId, nId) as Array<{ role: string; content: string; sources_json: string | null }>
  ).map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("assistant" as const),
    content: m.content,
    sources: m.sources_json
      ? (JSON.parse(m.sources_json) as Array<{ documentName: string; pageNumber: number | null }>)
      : undefined,
  }));

  const savedFiche = getSavedFiche(user.id, nId);

  const references = searchChunks({
    userId: user.id,
    courseId,
    query: `${String(notion.title)} ${String(notion.summary ?? "")}`,
    limit: 5,
  });

  const chapterFigure = references.find((r) => r.pageNumber) ?? null;

  const notionIndex = allNotions.findIndex((n) => n.id === nId);
  const prev = notionIndex > 0 ? allNotions[notionIndex - 1] : null;
  const next = notionIndex >= 0 && notionIndex < allNotions.length - 1 ? allNotions[notionIndex + 1] : null;

  const lesson = (
    <div className="board-surface relative overflow-hidden rounded-3xl p-6 shadow-card sm:p-8">
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:22px_22px]" />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
          <Link href={`/parcours/${courseId}`} className="hover:text-white">
            {String(course.title)}
          </Link>
          {notion.module_title ? <span>· {String(notion.module_title)}</span> : null}
        </div>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <h1 className="font-display text-2xl leading-tight text-white sm:text-3xl">{String(notion.title)}</h1>
          <Badge tone={currentStatus === "maitrise" ? "green" : currentStatus === "a_revoir" ? "coral" : "yellow"}>
            {statusLabel(currentStatus)}
          </Badge>
        </div>

        {notion.summary ? <p className="mt-4 text-base leading-relaxed text-white/85">{String(notion.summary)}</p> : null}

        {notion.explanation ? (
          <section className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-yellow">Explication progressive</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/80">{String(notion.explanation)}</p>
          </section>
        ) : null}

        {notion.example ? (
          <section className="mt-5 rounded-2xl bg-white/8 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-coral">Exemple concret</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/85">{String(notion.example)}</p>
          </section>
        ) : null}

        {notion.diagram ? (
          <section className="mt-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">Schéma technique</h2>
            <div className="mt-2">
              <Diagram code={String(notion.diagram)} />
            </div>
          </section>
        ) : null}

        {course.domain === "reseau" ? (
          <section className="mt-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              Schéma animé pas à pas
            </h2>
            {chapterFigure ? (
              <div className="mt-2 space-y-2">
                <ZoomableImage
                  src={`/api/documents/${chapterFigure.documentId}/page-image?page=${chapterFigure.pageNumber}`}
                  alt={`Figure du chapitre — ${chapterFigure.documentName}, page ${chapterFigure.pageNumber}`}
                  caption={`Figure du chapitre : ${chapterFigure.documentName}, page ${chapterFigure.pageNumber}`}
                  className="max-h-80"
                />
                <p className="text-xs text-white/60">
                  Le schéma animé ci-dessous explique le mécanisme de cette figure du document.
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-white/50">
                Aucune figure de page n&apos;est disponible pour cette notion ; le schéma animé reste
                une explication générale.
              </p>
            )}
            <div className="mt-2">
              <NetworkAnimation
                title={String(notion.title)}
                context={[notion.summary, notion.explanation, notion.example].filter(Boolean).join(" ")}
              />
            </div>
          </section>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <form action={markNotionAction}>
            <input type="hidden" name="notion_id" value={nId} />
            <input type="hidden" name="course_id" value={courseId} />
            <input type="hidden" name="action" value="etudie" />
            <button className="btn-accent px-3 py-1.5 text-xs" type="submit">Marquer comme étudié</button>
          </form>
          <form action={markNotionAction}>
            <input type="hidden" name="notion_id" value={nId} />
            <input type="hidden" name="course_id" value={courseId} />
            <input type="hidden" name="action" value="a_revoir" />
            <button className="btn border border-white/25 bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20" type="submit">À revoir</button>
          </form>
          {savedFiche ? (
            <>
              <Link
                href={`/parcours/${courseId}/salle/${nId}/fiche`}
                className="btn border border-white/25 bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20"
              >
                Voir la fiche enregistrée
              </Link>
              <form action={generateFicheAction}>
                <input type="hidden" name="course_id" value={courseId} />
                <input type="hidden" name="notion_id" value={nId} />
                <input type="hidden" name="variant" value="standard" />
                <button type="submit" className="btn border border-white/25 bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20">
                  Régénérer la fiche
                </button>
              </form>
            </>
          ) : (
            <form action={generateFicheAction}>
              <input type="hidden" name="course_id" value={courseId} />
              <input type="hidden" name="notion_id" value={nId} />
              <input type="hidden" name="variant" value="standard" />
              <button type="submit" className="btn border border-white/25 bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20">
                Créer une fiche visuelle
              </button>
            </form>
          )}
        </div>

        {attemptCount.n > 0 && currentStatus === "non_commence" ? (
          <p className="mt-4 rounded-xl bg-accent-yellow/15 px-3.5 py-2.5 text-xs leading-relaxed text-accent-yellow">
            Des évaluations sont enregistrées pour cette notion, mais elle n&apos;est pas marquée comme
            étudiée. La maîtrise n&apos;est validée qu&apos;après avoir étudié la notion : utilisez
            « Marquer comme étudié ».
          </p>
        ) : null}

        <details className="mt-7 border-t border-white/15 pt-4">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.18em] text-white/50 hover:text-white/70">
            Pages du document ({references.length})
          </summary>
          {references.length === 0 ? (
            <p className="mt-2 text-sm text-white/60">
              Aucune référence trouvée dans vos documents pour cette notion. Les compléments du tuteur
              relèvent alors de connaissances générales.
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {references.map((r) => (
                <li key={r.chunkId} className="rounded-xl bg-white/8 p-3">
                  <div className="flex gap-3">
                    {r.pageNumber ? (
                      <Link
                        href={`/parcours/${courseId}/documents/${r.documentId}?page=${r.pageNumber}`}
                        className="shrink-0 overflow-hidden rounded-lg border border-white/15"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/documents/${r.documentId}/page-image?page=${r.pageNumber}`}
                          alt={`${r.documentName} — page ${r.pageNumber}`}
                          className="h-20 w-16 object-cover object-top"
                          loading="lazy"
                        />
                      </Link>
                    ) : null}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-medium text-white/90">{r.documentName}</span>
                        {r.pageNumber ? (
                          <Link
                            className="rounded-full bg-accent-yellow/20 px-2 py-0.5 text-accent-yellow hover:bg-accent-yellow/30"
                            href={`/parcours/${courseId}/documents/${r.documentId}?page=${r.pageNumber}`}
                          >
                            page {r.pageNumber}
                          </Link>
                        ) : (
                          <span className="text-white/50">section de notes</span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/65">{r.content}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </details>

        <div className="mt-7 flex items-center justify-between gap-3 text-sm">
          {prev ? (
            <Link href={`/parcours/${courseId}/salle/${prev.id}`} className="text-white/70 hover:text-white">
              ← {prev.title}
            </Link>
          ) : <span />}
          {next ? (
            <Link href={`/parcours/${courseId}/salle/${next.id}`} className="text-right text-white/70 hover:text-white">
              {next.title} →
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );

  const notebook = (
    <div className="paper-surface rounded-3xl border border-paper-line p-6 shadow-card">
      <h2 className="font-display text-lg text-ink">Cahier d&apos;étude</h2>
      <p className="mt-0.5 text-xs text-ink-faint">Plan, statuts et notes</p>

      <div className="mt-4 max-h-72 space-y-1.5 overflow-y-auto pr-1">
        {allNotions.map((n) => {
          const st = statusMap.get(n.id) ?? "non_commence";
          return (
            <Link
              key={n.id}
              href={`/parcours/${courseId}/salle/${n.id}`}
              className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs transition ${
                n.id === nId ? "bg-board text-white" : "text-ink-soft hover:bg-ink/5"
              }`}
            >
              <span className="truncate">{n.title}</span>
              <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] ${
                n.id === nId
                  ? "bg-white/20 text-white"
                  : st === "maitrise"
                    ? "bg-board/15 text-board-deep"
                    : st === "a_revoir"
                      ? "bg-accent-coral/20 text-[#a33c22]"
                      : st === "etudie"
                        ? "bg-accent-yellow/30 text-[#7a5b00]"
                        : "bg-ink/5 text-ink-faint"
              }`}>
                {statusLabel(st)}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-5 border-t border-paper-line pt-4">
        <h3 className="font-display text-sm text-ink">À retenir</h3>
        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-ink-soft">
          <li>• Une page ouverte n&apos;équivaut pas à une notion maîtrisée.</li>
          <li>• La maîtrise se vérifie par les exercices et évaluations.</li>
          <li>• Les références citent le document et la page lorsqu&apos;elle existe.</li>
        </ul>
      </div>

      <div className="mt-5 border-t border-paper-line pt-4">
        <NoteEditor notionId={nId} courseId={courseId} initialContent={noteRow?.content ?? ""} />
      </div>

      <div className="mt-5 flex flex-wrap gap-3 border-t border-paper-line pt-4 text-xs text-ink-faint">
        <Link href={`/parcours/${courseId}/exercices`} className="font-medium text-board-deep hover:underline">
          Passer aux exercices →
        </Link>
        <Link href={`/parcours/${courseId}/visuel`} className="font-medium text-board-deep hover:underline">
          Révision visuelle →
        </Link>
      </div>
    </div>
  );

  const tutor = (
    <TutorChat courseId={courseId} notionId={nId} initialMessages={chatMessages} configured={aiConfigured()} />
  );

  return (
    <div>
      <Link href={`/parcours/${courseId}`} className="text-sm text-ink-soft hover:text-ink">
        ← Retour au parcours
      </Link>
      <div className="mt-4">
        <ClassroomLayout lesson={lesson} notebook={notebook} tutor={tutor} />
      </div>
    </div>
  );
}

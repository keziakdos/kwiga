import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getDb } from "@/lib/db";
import { getCourseForUser } from "@/lib/courses";
import { getPlanForCourse, type PlanContent } from "@/lib/plans";
import { computeCourseProgress } from "@/lib/progress";
import { PdfUploadForm, NotesForm } from "@/components/DocumentForms";
import { archiveCourseAction, deleteCourseAction, generatePlanAction, regeneratePlanAction, validatePlanAction } from "@/app/actions/courses";
import { deleteDocumentAction } from "@/app/actions/documents";
import { Badge, ProgressBar, SectionTitle } from "@/components/ui";
import { domainLabel, levelLabel } from "@/lib/validation";

export const dynamic = "force-dynamic";

const DOC_STATUS: Record<string, { label: string; tone: "neutral" | "yellow" | "green" | "coral" }> = {
  pending: { label: "En attente", tone: "neutral" },
  processing: { label: "En cours", tone: "yellow" },
  done: { label: "Terminé", tone: "green" },
  error: { label: "Erreur", tone: "coral" },
};

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/connexion");
  const courseId = Number((await params).id);
  const course = getCourseForUser(courseId, user.id);
  if (!course) notFound();
  const sp = await searchParams;

  const db = getDb();
  const documents = db
    .prepare("SELECT * FROM documents WHERE course_id = ? AND user_id = ? ORDER BY created_at DESC")
    .all(courseId, user.id) as Array<Record<string, unknown>>;
  const plan = getPlanForCourse(courseId);
  const progress = computeCourseProgress(user.id, courseId);

  const modules = db
    .prepare("SELECT * FROM modules WHERE course_id = ? ORDER BY ord")
    .all(courseId) as Array<Record<string, unknown>>;
  const notions = db
    .prepare("SELECT * FROM notions WHERE course_id = ? ORDER BY ord")
    .all(courseId) as Array<Record<string, unknown>>;
  const progressRows = db
    .prepare(
      `SELECT np.notion_id, np.status FROM notion_progress np JOIN notions n ON n.id = np.notion_id
       WHERE np.user_id = ? AND n.course_id = ?`,
    )
    .all(user.id, courseId) as Array<{ notion_id: number; status: string }>;
  const statusByNotion = new Map(progressRows.map((r) => [r.notion_id, r.status]));

  const proposed = plan && plan.status === "proposed" ? (JSON.parse(plan.content_json) as PlanContent) : null;
  const hasContent = documents.length > 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/parcours" className="text-sm text-ink-soft hover:text-ink">
            ← Mes parcours
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone="green">{domainLabel(String(course.domain))}</Badge>
            <Badge>{levelLabel(String(course.level))}</Badge>
            <Badge tone={course.status === "archived" ? "neutral" : course.status === "active" ? "green" : "yellow"}>
              {course.status === "active" ? "Actif" : course.status === "archived" ? "Archivé" : "Brouillon"}
            </Badge>
          </div>
          <h1 className="mt-3 font-display text-3xl text-ink">{String(course.title)}</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">{String(course.goal)}</p>
          {course.target_duration ? <p className="mt-1 text-xs text-ink-faint">Durée cible : {String(course.target_duration)}</p> : null}
        </div>
        <div className="w-full max-w-xs space-y-2">
          <ProgressBar value={progress.avancement} label="Avancement" />
          <ProgressBar value={progress.maitrise} tone="yellow" label="Maîtrise" />
          <p className="text-xs text-ink-faint">
            {progress.totalNotions} notions · {progress.mastered} maîtrisées · {progress.toReview} à revoir
          </p>
        </div>
      </div>

      {sp.erreur ? (
        <p role="alert" className="rounded-xl bg-accent-coral/10 px-4 py-3 text-sm text-[#a33c22]">{sp.erreur}</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-6">
          <div className="card p-6">
            <SectionTitle>Documents sources</SectionTitle>
            {documents.length === 0 ? (
              <p className="text-sm text-ink-soft">Aucun document. Importez un PDF ou collez vos notes ci-contre.</p>
            ) : (
              <ul className="space-y-2.5">
                {documents.map((doc) => {
                  const meta = DOC_STATUS[String(doc.status)] ?? DOC_STATUS.pending;
                  return (
                    <li key={String(doc.id)} className="rounded-xl border border-ink/10 bg-white px-3.5 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-ink">{String(doc.original_name)}</p>
                          <p className="mt-0.5 text-xs text-ink-faint">
                            {doc.kind === "pdf" ? `PDF · ${String(doc.page_count)} pages` : "Notes texte"} ·{" "}
                            {(Number(doc.size_bytes) / 1024).toFixed(0)} Ko
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                          <form action={deleteDocumentAction}>
                            <input type="hidden" name="document_id" value={String(doc.id)} />
                            <button type="submit" className="text-xs text-ink-faint hover:text-[#a33c22]" aria-label={`Supprimer ${String(doc.original_name)}`}>
                              Supprimer
                            </button>
                          </form>
                        </div>
                      </div>
                      {doc.status === "error" && doc.error_message ? (
                        <p className="mt-2 rounded-lg bg-accent-coral/10 px-3 py-2 text-xs text-[#a33c22]">{String(doc.error_message)}</p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-4 text-xs text-ink-faint">
              Les PDF scannés sans texte exploitable sont signalés. L&apos;OCR n&apos;est pas activé.
            </p>
          </div>

          <div className="card p-6">
            <SectionTitle>Plan d&apos;apprentissage</SectionTitle>

            {!plan ? (
              <div className="space-y-3">
                <p className="text-sm text-ink-soft">
                  {hasContent
                    ? "Vos documents sont prêts. Générez un plan structuré, puis validez-le ou régénérez-le."
                    : "Importez d'abord un PDF ou des notes pour construire un plan adapté à votre contenu."}
                </p>
                <form action={generatePlanAction}>
                  <input type="hidden" name="course_id" value={courseId} />
                  <button className="btn-primary" type="submit" disabled={!hasContent}>
                    Générer le plan
                  </button>
                </form>
              </div>
            ) : proposed ? (
              <div className="space-y-4">
                <p className="text-sm text-ink-soft">
                  Proposition non validée. Vous pouvez la valider telle quelle ou la régénérer après avoir ajouté des documents.
                </p>
                {proposed.prerequisites?.length ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Prérequis</p>
                    <ul className="mt-1 list-inside list-disc text-sm text-ink-soft">
                      {proposed.prerequisites.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <ol className="space-y-3">
                  {proposed.modules.map((m, i) => (
                    <li key={i} className="rounded-xl border border-ink/10 bg-white p-4">
                      <p className="font-medium text-ink">{m.title}</p>
                      <p className="mt-1 text-sm text-ink-soft">{m.description}</p>
                      <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                        {m.notions.map((n, j) => (
                          <li key={j} className="flex gap-2">
                            <span className="text-ink-faint">•</span>
                            <span>
                              <span className="text-ink">{n.title}</span>
                              {n.summary ? <span className="text-ink-soft"> — {n.summary}</span> : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
                <div className="flex flex-wrap gap-2">
                  <form action={validatePlanAction}>
                    <input type="hidden" name="course_id" value={courseId} />
                    <button className="btn-primary" type="submit">Valider ce plan</button>
                  </form>
                  <form action={regeneratePlanAction}>
                    <input type="hidden" name="course_id" value={courseId} />
                    <button className="btn-ghost" type="submit">Régénérer</button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {modules.length === 0 ? (
                  <p className="text-sm text-ink-soft">Aucun module. Générez un plan.</p>
                ) : (
                  <div className="space-y-5">
                    {modules.map((mod) => {
                      const modNotions = notions.filter((n) => n.module_id === mod.id);
                      return (
                        <div key={String(mod.id)}>
                          <p className="font-display text-base text-ink">{String(mod.title)}</p>
                          <p className="text-xs text-ink-faint">{String(mod.description ?? "")}</p>
                          <ul className="mt-2 space-y-1.5">
                            {modNotions.map((n) => {
                              const st = statusByNotion.get(Number(n.id)) ?? "non_commence";
                              return (
                                <li key={String(n.id)}>
                                  <Link
                                    href={`/parcours/${courseId}/salle/${n.id}`}
                                    className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white px-3.5 py-2.5 text-sm transition hover:border-board/30"
                                  >
                                    <span className="text-ink">{String(n.title)}</span>
                                    <Badge tone={st === "maitrise" ? "green" : st === "a_revoir" ? "coral" : st === "etudie" ? "yellow" : "neutral"}>
                                      {st === "maitrise" ? "Maîtrisé" : st === "a_revoir" ? "À revoir" : st === "etudie" ? "Étudié" : "Non commencé"}
                                    </Badge>
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Link href={`/parcours/${courseId}/exercices`} className="btn-ghost">Exercices</Link>
                  <Link href={`/parcours/${courseId}/progression`} className="btn-ghost">Progression</Link>
                </div>
                <details className="mt-3 text-xs text-ink-soft">
                  <summary className="cursor-pointer text-board-deep">Relancer l&apos;analyse du document</summary>
                  <p className="mt-2 rounded-lg bg-accent-yellow/15 px-3 py-2 text-[#7a5b00]">
                    Utile si le plan a ignoré des pages ou des sujets. Attention : un nouveau plan remplace
                    les notions actuelles et réinitialise la progression de ce parcours.
                  </p>
                  <form action={regeneratePlanAction} className="mt-2">
                    <input type="hidden" name="course_id" value={courseId} />
                    <button type="submit" className="btn-ghost px-3 py-1.5 text-xs">
                      Générer un nouveau plan
                    </button>
                  </form>
                </details>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="card p-6">
            <SectionTitle>Ajouter un document</SectionTitle>
            <div className="space-y-6">
              <PdfUploadForm courseId={courseId} />
              <div className="border-t border-ink/10 pt-5">
                <NotesForm courseId={courseId} />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <SectionTitle>Gérer le parcours</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {course.status !== "archived" ? (
                <form action={archiveCourseAction}>
                  <input type="hidden" name="course_id" value={courseId} />
                  <button type="submit" className="btn-ghost px-3 py-1.5 text-xs">Archiver</button>
                </form>
              ) : null}
            </div>
            <details className="mt-4 text-xs text-ink-soft">
              <summary className="cursor-pointer font-medium text-[#a33c22]">Supprimer définitivement</summary>
              <form action={deleteCourseAction} className="mt-3 space-y-2">
                <input type="hidden" name="course_id" value={courseId} />
                <p>Cette action supprime le parcours, ses documents et son historique. Tapez SUPPRIMER pour confirmer.</p>
                <input name="confirm" className="field" placeholder="SUPPRIMER" required />
                <button type="submit" className="btn bg-[#a33c22] text-white hover:brightness-95">Supprimer</button>
              </form>
            </details>
          </div>
        </aside>
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getDb } from "@/lib/db";
import { getCourseForUser } from "@/lib/courses";
import { computeCourseProgress } from "@/lib/progress";
import { ProgressBar, StatCard, SectionTitle, Badge } from "@/components/ui";
import { statusLabel } from "@/lib/validation";

export const dynamic = "force-dynamic";

export default async function ProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/connexion");
  const courseId = Number((await params).id);
  const course = getCourseForUser(courseId, user.id);
  if (!course) notFound();

  const db = getDb();
  const progress = computeCourseProgress(user.id, courseId);
  const notions = db
    .prepare(
      `SELECT n.id, n.title, m.title AS module_title, np.status, np.mastery_score, np.last_studied_at
       FROM notions n LEFT JOIN modules m ON m.id = n.module_id
       LEFT JOIN notion_progress np ON np.notion_id = n.id AND np.user_id = ?
       WHERE n.course_id = ? ORDER BY n.ord`,
    )
    .all(user.id, courseId) as Array<Record<string, unknown>>;

  const attempts = db
    .prepare(
      `SELECT ea.score, ea.max_score, ea.ai_graded, ea.created_at, e.type, e.prompt
       FROM exercise_attempts ea JOIN exercises e ON e.id = ea.exercise_id
       WHERE ea.user_id = ? AND e.course_id = ? ORDER BY ea.created_at DESC LIMIT 20`,
    )
    .all(user.id, courseId) as Array<Record<string, unknown>>;

  const revisions = db
    .prepare(
      `SELECT r.due_at, r.reason, r.done, n.title FROM revisions r JOIN notions n ON n.id = r.notion_id
       WHERE r.user_id = ? AND n.course_id = ? ORDER BY r.due_at DESC LIMIT 20`,
    )
    .all(user.id, courseId) as Array<Record<string, unknown>>;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href={`/parcours/${courseId}`} className="text-sm text-ink-soft hover:text-ink">
        ← {String(course.title)}
      </Link>
      <h1 className="mt-4 font-display text-3xl text-ink">Progression</h1>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Avancement" value={`${Math.round(progress.avancement * 100)} %`} hint="notions travaillées / total" />
        <StatCard label="Maîtrise" value={`${Math.round(progress.maitrise * 100)} %`} hint="notions validées par évaluation" tone="yellow" />
        <StatCard label="À revoir" value={String(progress.toReview)} hint={`${progress.totalNotions} notions au total`} tone="coral" />
      </div>

      <section className="card mt-6 p-6">
        <SectionTitle>Comment est calculée la progression ?</SectionTitle>
        <div className="space-y-2 text-sm leading-relaxed text-ink-soft">
          <p>
            <strong className="text-ink">Avancement</strong> = notions travaillées ÷ notions totales. Une
            notion compte comme travaillée dès que vous l&apos;avez étudiée ou évaluée.
          </p>
          <p>
            <strong className="text-ink">Maîtrise</strong> = notions validées ÷ notions totales. Une notion
            est validée lorsque votre moyenne aux exercices corrigés atteint 80 %. Entre 50 % et 80 %,
            elle passe « à revoir ».
          </p>
          <p>
            Ouvrir une page ne valide jamais une notion. Seules les évaluations corrigées comptent.
            Les réponses non corrigées (IA non configurée) sont conservées mais exclues du calcul.
          </p>
        </div>
      </section>

      <section className="card mt-6 p-6">
        <SectionTitle>Détail par notion</SectionTitle>
        <div className="space-y-4">
          {notions.map((n) => {
            const st = String(n.status ?? "non_commence");
            return (
              <div key={String(n.id)}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Link href={`/parcours/${courseId}/salle/${n.id}`} className="text-sm font-medium text-ink hover:text-board-deep">
                      {String(n.title)}
                    </Link>
                    <p className="text-xs text-ink-faint">{String(n.module_title ?? "")}</p>
                  </div>
                  <Badge tone={st === "maitrise" ? "green" : st === "a_revoir" ? "coral" : st === "etudie" ? "yellow" : "neutral"}>
                    {statusLabel(st)}
                  </Badge>
                </div>
                <div className="mt-1.5">
                  <ProgressBar value={Number(n.mastery_score ?? 0)} tone="yellow" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <SectionTitle>Tentatives récentes</SectionTitle>
          {attempts.length === 0 ? (
            <p className="text-sm text-ink-soft">Aucune tentative enregistrée.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {attempts.map((a, i) => (
                <li key={i} className="rounded-xl border border-ink/10 bg-white px-3.5 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-ink-soft">{String(a.type)}</span>
                    <span className="text-xs font-semibold text-ink">
                      {Number(a.score)} / {Number(a.max_score)}
                      {Number(a.ai_graded) ? "" : " (non corrigée)"}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-ink-faint">{String(a.prompt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-6">
          <SectionTitle>Révisions</SectionTitle>
          {revisions.length === 0 ? (
            <p className="text-sm text-ink-soft">Aucune révision programmée.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {revisions.map((r, i) => (
                <li key={i} className="flex items-center justify-between gap-2 rounded-xl border border-ink/10 bg-white px-3.5 py-2.5">
                  <span className="text-ink">{String(r.title)}</span>
                  <Badge tone={r.done ? "green" : "yellow"}>{r.done ? "Faite" : String(r.reason ?? "À faire")}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-6 flex gap-2">
        <Link href={`/parcours/${courseId}/exercices`} className="btn-primary">Exercices</Link>
        <Link href={`/parcours/${courseId}`} className="btn-ghost">Retour au parcours</Link>
      </div>
    </div>
  );
}

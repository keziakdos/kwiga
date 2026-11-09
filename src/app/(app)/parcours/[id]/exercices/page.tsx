import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getDb } from "@/lib/db";
import { getCourseForUser } from "@/lib/courses";
import { getBestAttempt } from "@/lib/exercises";
import { ExerciseList, type ExerciseView } from "@/components/ExerciseList";

export const dynamic = "force-dynamic";

export default async function ExercisesPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/connexion");
  const courseId = Number((await params).id);
  const course = getCourseForUser(courseId, user.id);
  if (!course) notFound();

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT e.*, n.title AS notion_title FROM exercises e
       LEFT JOIN notions n ON n.id = e.notion_id
       WHERE e.course_id = ? ORDER BY n.ord, e.id`,
    )
    .all(courseId) as Array<Record<string, unknown>>;

  const exercises: ExerciseView[] = rows.map((row) => {
    const best = getBestAttempt(user.id, Number(row.id));
    return {
      id: Number(row.id),
      type: String(row.type),
      prompt: String(row.prompt),
      options: row.options_json ? (JSON.parse(String(row.options_json)) as string[]) : null,
      criteria: row.criteria_json ? JSON.parse(String(row.criteria_json)) : null,
      points: Number(row.points),
      best: best ? { score: best.score, max: best.max_score, feedback: best.feedback, graded: best.ai_graded } : null,
    };
  });

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/parcours/${courseId}`} className="text-sm text-ink-soft hover:text-ink">
        ← {String(course.title)}
      </Link>
      <h1 className="mt-4 font-display text-3xl text-ink">Exercices et évaluations</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Les questions ouvertes affichent leurs critères. Vous pouvez retenter autant que nécessaire.
        Les évaluations IA sont une aide pédagogique, pas une certification.
      </p>

      <div className="mt-6">
        <ExerciseList exercises={exercises} courseId={courseId} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href={`/parcours/${courseId}/progression`} className="btn-ghost">
          Voir ma progression
        </Link>
        <Link href={`/parcours/${courseId}`} className="btn-ghost">
          Retour au parcours
        </Link>
      </div>
    </div>
  );
}

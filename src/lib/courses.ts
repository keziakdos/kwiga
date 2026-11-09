import { getDb } from "./db";
import { config } from "./config";

export class LimitError extends Error {}

export type Domain = "reseau" | "cybersecurite" | "webmaster";
export type Level = "debutant" | "intermediaire" | "avance";

export function getActiveCourseLimit(): number {
  const db = getDb();
  const row = db.prepare("SELECT value FROM app_settings WHERE key = 'max_active_courses'").get() as
    | { value: string }
    | undefined;
  const n = row ? Number.parseInt(row.value, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : config.limits.maxActiveCourses;
}

export function countActiveCourses(userId: number): number {
  const db = getDb();
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM courses WHERE user_id = ? AND status IN ('draft','active')")
    .get(userId) as { n: number };
  return row.n;
}

export function createCourse(params: {
  userId: number;
  title: string;
  domain: Domain;
  level: Level;
  goal: string;
  targetDuration?: string | null;
}): number {
  const db = getDb();
  const tx = db.transaction(() => {
    const limit = getActiveCourseLimit();
    const count = countActiveCourses(params.userId);
    if (count >= limit) {
      throw new LimitError(
        `Limite atteinte : ${limit} parcours actifs maximum. Archivez un parcours pour en créer un nouveau.`,
      );
    }
    const res = db
      .prepare(
        `INSERT INTO courses (user_id, title, domain, level, goal, target_duration, status)
         VALUES (?, ?, ?, ?, ?, ?, 'draft')`,
      )
      .run(
        params.userId,
        params.title.trim().slice(0, 160),
        params.domain,
        params.level,
        params.goal.trim().slice(0, 2000),
        params.targetDuration?.trim().slice(0, 80) || null,
      );
    return Number(res.lastInsertRowid);
  });
  return tx.immediate();
}

export function activateCourse(userId: number, courseId: number) {
  const db = getDb();
  const tx = db.transaction(() => {
    const course = db
      .prepare("SELECT id, status FROM courses WHERE id = ? AND user_id = ?")
      .get(courseId, userId) as { id: number; status: string } | undefined;
    if (!course) throw new Error("Parcours introuvable");
    if (course.status === "active") return;
    if (course.status === "archived") throw new Error("Réactivez le parcours au lieu de le valider.");
    db.prepare("UPDATE courses SET status = 'active', updated_at = datetime('now') WHERE id = ?").run(courseId);
  });
  tx.immediate();
}

export function archiveCourse(userId: number, courseId: number) {
  const db = getDb();
  db.prepare(
    "UPDATE courses SET status = 'archived', updated_at = datetime('now') WHERE id = ? AND user_id = ?",
  ).run(courseId, userId);
}

export function reactivateCourse(userId: number, courseId: number) {
  const db = getDb();
  const tx = db.transaction(() => {
    const course = db
      .prepare("SELECT id, status FROM courses WHERE id = ? AND user_id = ?")
      .get(courseId, userId) as { id: number; status: string } | undefined;
    if (!course) throw new Error("Parcours introuvable");
    if (course.status !== "archived") return;
    const limit = getActiveCourseLimit();
    const count = countActiveCourses(userId);
    if (count >= limit) {
      throw new LimitError(
        `Impossible de réactiver : ${limit} parcours actifs maximum. Archivez ou supprimez un parcours.`,
      );
    }
    db.prepare("UPDATE courses SET status = 'active', updated_at = datetime('now') WHERE id = ?").run(courseId);
  });
  tx.immediate();
}

export function getCourseForUser(courseId: number, userId: number, opts: { admin?: boolean } = {}) {
  const db = getDb();
  const row = db.prepare("SELECT * FROM courses WHERE id = ?").get(courseId) as
    | Record<string, unknown>
    | undefined;
  if (!row) return null;
  if (!opts.admin && row.user_id !== userId) return null;
  return row;
}

import { getDb } from "./db";

export type NotionStatus = "non_commence" | "etudie" | "a_revoir" | "maitrise";

export function recordActivity(params: {
  userId: number;
  courseId?: number | null;
  notionId?: number | null;
  type: string;
  label: string;
}) {
  const db = getDb();
  db.prepare(
    "INSERT INTO activities (user_id, course_id, notion_id, type, label) VALUES (?, ?, ?, ?, ?)",
  ).run(params.userId, params.courseId ?? null, params.notionId ?? null, params.type, params.label.slice(0, 200));
}

export function touchNotionStudy(userId: number, notionId: number) {
  // Trace la dernière consultation sans valider l'étude : seule une action
  // explicite (« Marquer comme étudié ») permet ensuite la maîtrise.
  const db = getDb();
  db.prepare(
    `INSERT INTO notion_progress (user_id, notion_id, status, last_studied_at, updated_at)
     VALUES (?, ?, 'non_commence', datetime('now'), datetime('now'))
     ON CONFLICT(user_id, notion_id) DO UPDATE SET
       last_studied_at = datetime('now'),
       updated_at = datetime('now')`,
  ).run(userId, notionId);
}

export function setNotionStatus(userId: number, notionId: number, status: NotionStatus) {
  const db = getDb();
  db.prepare(
    `INSERT INTO notion_progress (user_id, notion_id, status, last_studied_at, updated_at)
     VALUES (?, ?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(user_id, notion_id) DO UPDATE SET status = excluded.status, updated_at = datetime('now')`,
  ).run(userId, notionId, status);
}

export function recomputeNotionMastery(userId: number, notionId: number) {
  const db = getDb();
  const existing = db
    .prepare("SELECT status FROM notion_progress WHERE user_id = ? AND notion_id = ?")
    .get(userId, notionId) as { status: string } | undefined;
  // Une évaluation ne peut valider une notion que si l'apprenant l'a étudiée.
  const studied = existing && ["etudie", "a_revoir", "maitrise"].includes(existing.status);
  if (!studied) return;

  const row = db
    .prepare(
      `SELECT COALESCE(SUM(best_score), 0) AS score, COALESCE(SUM(best_max), 0) AS max
       FROM (
         SELECT MAX(score) AS best_score, MAX(max_score) AS best_max
         FROM exercise_attempts
         WHERE user_id = ? AND ai_graded = 1
           AND exercise_id IN (SELECT id FROM exercises WHERE notion_id = ?)
         GROUP BY exercise_id
       )`,
    )
    .get(userId, notionId) as { score: number; max: number };

  if (row.max <= 0) return;

  const ratio = Math.min(1, row.score / row.max);
  const status: NotionStatus = ratio >= 0.8 ? "maitrise" : ratio >= 0.5 ? "a_revoir" : "etudie";

  db.prepare(
    `INSERT INTO notion_progress (user_id, notion_id, status, mastery_score, last_studied_at, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(user_id, notion_id) DO UPDATE SET
       status = excluded.status, mastery_score = excluded.mastery_score, updated_at = datetime('now')`,
  ).run(userId, notionId, status, ratio);

  if (status !== "maitrise") {
    const due = new Date(Date.now() + (status === "a_revoir" ? 2 : 1) * 86400_000).toISOString();
    db.prepare(
      `INSERT INTO revisions (user_id, notion_id, due_at, reason, done)
       VALUES (?, ?, ?, ?, 0)`,
    ).run(userId, notionId, due, status === "a_revoir" ? "Score insuffisant" : "À consolider");
  } else {
    db.prepare("UPDATE revisions SET done = 1 WHERE user_id = ? AND notion_id = ? AND done = 0").run(userId, notionId);
  }
}

export type CourseProgress = {
  totalNotions: number;
  studied: number;
  mastered: number;
  toReview: number;
  avancement: number;
  maitrise: number;
};

export function computeCourseProgress(userId: number, courseId: number): CourseProgress {
  const db = getDb();
  const total = db
    .prepare("SELECT COUNT(*) AS n FROM notions WHERE course_id = ?")
    .get(courseId) as { n: number };
  const rows = db
    .prepare(
      `SELECT np.status, COUNT(*) AS n FROM notion_progress np
       JOIN notions n ON n.id = np.notion_id
       WHERE np.user_id = ? AND n.course_id = ?
       GROUP BY np.status`,
    )
    .all(userId, courseId) as Array<{ status: string; n: number }>;

  const map = new Map(rows.map((r) => [r.status, r.n]));
  const studied = map.get("etudie") ?? 0;
  const toReview = map.get("a_revoir") ?? 0;
  const mastered = map.get("maitrise") ?? 0;
  const engaged = studied + toReview + mastered;
  return {
    totalNotions: total.n,
    studied,
    mastered,
    toReview,
    avancement: total.n > 0 ? engaged / total.n : 0,
    maitrise: total.n > 0 ? mastered / total.n : 0,
  };
}

export function dashboardStats(userId: number) {
  const db = getDb();
  const courses = db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM notions n WHERE n.course_id = c.id) AS notion_count
       FROM courses c WHERE c.user_id = ? AND c.status != 'archived' ORDER BY c.updated_at DESC`,
    )
    .all(userId) as Array<Record<string, unknown>>;

  const global = db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM notions n JOIN courses c ON c.id = n.course_id WHERE c.user_id = ? AND c.status = 'active') AS total,
         (SELECT COUNT(*) FROM notion_progress np JOIN notions n ON n.id = np.notion_id JOIN courses c ON c.id = n.course_id
            WHERE np.user_id = ? AND c.status = 'active' AND np.status != 'non_commence') AS engaged,
         (SELECT COUNT(*) FROM notion_progress np JOIN notions n ON n.id = np.notion_id JOIN courses c ON c.id = n.course_id
            WHERE np.user_id = ? AND c.status = 'active' AND np.status = 'maitrise') AS mastered,
         (SELECT COUNT(*) FROM exercise_attempts WHERE user_id = ?) AS attempts,
         (SELECT COALESCE(AVG(score / NULLIF(max_score, 0)), 0) FROM exercise_attempts WHERE user_id = ? AND ai_graded = 1) AS avg_score`,
    )
    .get(userId, userId, userId, userId, userId) as {
    total: number;
    engaged: number;
    mastered: number;
    attempts: number;
    avg_score: number;
  };

  const activities = db
    .prepare("SELECT * FROM activities WHERE user_id = ? ORDER BY created_at DESC LIMIT 12")
    .all(userId) as Array<Record<string, unknown>>;

  const revisions = db
    .prepare(
      `SELECT r.*, n.title AS notion_title, c.title AS course_title
       FROM revisions r JOIN notions n ON n.id = r.notion_id JOIN courses c ON c.id = n.course_id
       WHERE r.user_id = ? AND r.done = 0 ORDER BY r.due_at ASC LIMIT 8`,
    )
    .all(userId) as Array<Record<string, unknown>>;

  const toReview = db
    .prepare(
      `SELECT np.*, n.title AS notion_title, c.title AS course_title, c.id AS course_id
       FROM notion_progress np JOIN notions n ON n.id = np.notion_id JOIN courses c ON c.id = n.course_id
       WHERE np.user_id = ? AND np.status IN ('a_revoir') AND c.status = 'active'
       ORDER BY np.updated_at DESC LIMIT 8`,
    )
    .all(userId) as Array<Record<string, unknown>>;

  return {
    courses,
    global: {
      total: global.total,
      engaged: global.engaged,
      mastered: global.mastered,
      attempts: global.attempts,
      avgScore: global.avg_score,
      avancement: global.total > 0 ? global.engaged / global.total : 0,
      maitrise: global.total > 0 ? global.mastered / global.total : 0,
    },
    activities,
    revisions,
    toReview,
  };
}

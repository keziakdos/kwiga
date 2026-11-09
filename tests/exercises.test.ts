import { describe, it, expect, beforeEach } from "vitest";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { submitAttempt, getExerciseForUser, getBestAttempt } from "@/lib/exercises";
import { getCourseForUser } from "@/lib/courses";

const db = () => getDb();

async function makeUser(username: string): Promise<number> {
  const hash = await hashPassword("MotDePasseTest123");
  const res = db()
    .prepare("INSERT INTO users (username, display_name, password_hash) VALUES (?, ?, ?)")
    .run(username, username, hash);
  return Number(res.lastInsertRowid);
}

function makeCourse(userId: number, domain = "reseau"): number {
  const res = db()
    .prepare(
      "INSERT INTO courses (user_id, title, domain, level, goal, status) VALUES (?, 'Test', ?, 'debutant', 'Objectif', 'active')",
    )
    .run(userId, domain);
  return Number(res.lastInsertRowid);
}

function makeNotion(courseId: number): number {
  const res = db()
    .prepare("INSERT INTO notions (course_id, title, summary, ord) VALUES (?, 'IPv4', 'Résumé', 0)")
    .run(courseId);
  return Number(res.lastInsertRowid);
}

function reset() {
  db().exec("DELETE FROM exercise_attempts; DELETE FROM exercises; DELETE FROM notion_progress; DELETE FROM revisions; DELETE FROM notions; DELETE FROM courses; DELETE FROM users;");
}

beforeEach(reset);

describe("exercices et maîtrise", () => {
  it("corrige un QCM et met à jour la maîtrise", async () => {
    const userId = await makeUser("exo1");
    const courseId = makeCourse(userId);
    const notionId = makeNotion(courseId);
    const res = db()
      .prepare(
        "INSERT INTO exercises (course_id, notion_id, type, prompt, options_json, correct_json, points) VALUES (?, ?, 'qcm', 'IP ?', ?, ?, 1)",
      )
      .run(courseId, notionId, JSON.stringify(["Couche 2", "Couche 3"]), JSON.stringify("Couche 3"));
    const exerciseId = Number(res.lastInsertRowid);

    const { result } = await submitAttempt({ userId, exerciseId, answer: "Couche 3" });
    expect(result.graded).toBe(true);
    expect(result.score).toBe(1);
    expect(getBestAttempt(userId, exerciseId)?.score).toBe(1);

    const progress = db().prepare("SELECT status, mastery_score FROM notion_progress WHERE user_id = ? AND notion_id = ?").get(userId, notionId) as { status: string; mastery_score: number };
    expect(progress.status).toBe("maitrise");
    expect(progress.mastery_score).toBeCloseTo(1, 3);
  });

  it("corrige un calcul de sous-réseau", async () => {
    const userId = await makeUser("exo2");
    const courseId = makeCourse(userId);
    const notionId = makeNotion(courseId);
    const res = db()
      .prepare(
        "INSERT INTO exercises (course_id, notion_id, type, prompt, correct_json, points) VALUES (?, ?, 'subnet', 'Hôtes /27 ?', ?, 2)",
      )
      .run(courseId, notionId, JSON.stringify("30"));
    const exerciseId = Number(res.lastInsertRowid);
    const { result } = await submitAttempt({ userId, exerciseId, answer: "30" });
    expect(result.graded).toBe(true);
    expect(result.score).toBe(2);
  });

  it("conserve une réponse ouverte non corrigée sans valider la maîtrise (IA non configurée)", async () => {
    const userId = await makeUser("exo3");
    const courseId = makeCourse(userId);
    const notionId = makeNotion(courseId);
    const res = db()
      .prepare(
        "INSERT INTO exercises (course_id, notion_id, type, prompt, criteria_json, points) VALUES (?, ?, 'open', 'Expliquez…', ?, 3)",
      )
      .run(courseId, notionId, JSON.stringify("Clarté et exactitude"));
    const exerciseId = Number(res.lastInsertRowid);
    const { result } = await submitAttempt({ userId, exerciseId, answer: "Une explication." });
    expect(result.graded).toBe(false);
    const progress = db().prepare("SELECT COUNT(*) AS n FROM notion_progress WHERE user_id = ? AND notion_id = ?").get(userId, notionId) as { n: number };
    expect(progress.n).toBe(0);
  });

  it("isole les exercices entre utilisateurs", async () => {
    const a = await makeUser("exoA");
    const b = await makeUser("exoB");
    const courseId = makeCourse(a);
    const notionId = makeNotion(courseId);
    const res = db()
      .prepare("INSERT INTO exercises (course_id, notion_id, type, prompt, points) VALUES (?, ?, 'open', 'P', 1)")
      .run(courseId, notionId);
    const exerciseId = Number(res.lastInsertRowid);
    expect(getExerciseForUser(exerciseId, b)).toBeNull();
    expect(getExerciseForUser(exerciseId, a)).not.toBeNull();
    expect(getCourseForUser(courseId, b)).toBeNull();
  });
});

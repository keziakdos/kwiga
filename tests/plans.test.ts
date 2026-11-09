import { describe, it, expect, beforeEach } from "vitest";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createCourse } from "@/lib/courses";
import { saveProposedPlan, materializePlan, type PlanContent } from "@/lib/plans";

const db = () => getDb();

async function makeUser(username: string): Promise<number> {
  const hash = await hashPassword("MotDePasseTest123");
  const res = db()
    .prepare("INSERT INTO users (username, display_name, password_hash) VALUES (?, ?, ?)")
    .run(username, username, hash);
  return Number(res.lastInsertRowid);
}

beforeEach(() => {
  db().exec("DELETE FROM exercise_attempts; DELETE FROM exercises; DELETE FROM notion_progress; DELETE FROM notions; DELETE FROM modules; DELETE FROM plans; DELETE FROM courses; DELETE FROM users;");
});

describe("matérialisation du plan", () => {
  it("n'insère pas les exercices du module une fois par notion", async () => {
    const userId = await makeUser("plan1");
    const courseId = createCourse({ userId, title: "Plan", domain: "reseau", level: "debutant", goal: "Objectif de test" });
    const plan: PlanContent = {
      prerequisites: [],
      order: "Ordre",
      modules: [
        {
          title: "Module 1",
          description: "Desc",
          notions: [
            { title: "Notion A", summary: "Résumé A" },
            { title: "Notion B", summary: "Résumé B" },
            { title: "Notion C", summary: "Résumé C" },
          ],
          exercises: [
            { type: "qcm", prompt: "Question unique ?", options: ["a", "b"], correct: "a", points: 1 },
          ],
        },
      ],
    };
    const planId = saveProposedPlan(courseId, plan);
    materializePlan(courseId, planId, plan);

    const exercises = db().prepare("SELECT COUNT(*) AS n FROM exercises WHERE course_id = ?").get(courseId) as { n: number };
    const notions = db().prepare("SELECT COUNT(*) AS n FROM notions WHERE course_id = ?").get(courseId) as { n: number };
    expect(notions.n).toBe(3);
    expect(exercises.n).toBe(1);
  });
});

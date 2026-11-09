import { describe, it, expect, beforeEach } from "vitest";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createCourse, archiveCourse, reactivateCourse, countActiveCourses, LimitError, getCourseForUser } from "@/lib/courses";

const db = () => getDb();

async function makeUser(username: string): Promise<number> {
  const hash = await hashPassword("MotDePasseTest123");
  const res = db()
    .prepare("INSERT INTO users (username, display_name, password_hash) VALUES (?, ?, ?)")
    .run(username, username, hash);
  return Number(res.lastInsertRowid);
}

function resetCourses() {
  db().exec("DELETE FROM notion_progress; DELETE FROM notions; DELETE FROM modules; DELETE FROM plans; DELETE FROM courses; DELETE FROM users;");
  db().prepare("DELETE FROM app_settings WHERE key = 'max_active_courses'").run();
}

beforeEach(resetCourses);

describe("limite de parcours actifs", () => {
  it("applique la limite de 3 côté serveur", async () => {
    const userId = await makeUser("limite");
    createCourse({ userId, title: "P1", domain: "reseau", level: "debutant", goal: "Objectif numéro un" });
    createCourse({ userId, title: "P2", domain: "reseau", level: "debutant", goal: "Objectif numéro deux" });
    createCourse({ userId, title: "P3", domain: "reseau", level: "debutant", goal: "Objectif numéro trois" });
    expect(countActiveCourses(userId)).toBe(3);
    expect(() =>
      createCourse({ userId, title: "P4", domain: "reseau", level: "debutant", goal: "Objectif numéro quatre" }),
    ).toThrow(LimitError);
  });

  it("libère une place après archivage et la reprend à la réactivation", async () => {
    const userId = await makeUser("archiveur");
    const c1 = createCourse({ userId, title: "P1", domain: "reseau", level: "debutant", goal: "Objectif un" });
    createCourse({ userId, title: "P2", domain: "reseau", level: "debutant", goal: "Objectif deux" });
    createCourse({ userId, title: "P3", domain: "reseau", level: "debutant", goal: "Objectif trois" });
    expect(() => createCourse({ userId, title: "P4", domain: "reseau", level: "debutant", goal: "Objectif quatre" })).toThrow(LimitError);

    archiveCourse(userId, c1);
    expect(countActiveCourses(userId)).toBe(2);
    createCourse({ userId, title: "P4", domain: "reseau", level: "debutant", goal: "Objectif quatre" });
    expect(countActiveCourses(userId)).toBe(3);

    expect(() => reactivateCourse(userId, c1)).toThrow(LimitError);
  });

  it("respecte une limite configurée par l'administrateur", async () => {
    db().prepare("INSERT INTO app_settings (key, value) VALUES ('max_active_courses', '1')").run();
    const userId = await makeUser("limiteconf");
    createCourse({ userId, title: "P1", domain: "reseau", level: "debutant", goal: "Objectif un" });
    expect(() => createCourse({ userId, title: "P2", domain: "reseau", level: "debutant", goal: "Objectif deux" })).toThrow(LimitError);
  });
});

describe("isolation entre utilisateurs", () => {
  it("empêche un apprenant d'accéder au parcours d'un autre", async () => {
    const a = await makeUser("alice");
    const b = await makeUser("bob");
    const courseA = createCourse({ userId: a, title: "Chez Alice", domain: "reseau", level: "debutant", goal: "Objectif Alice" });
    expect(getCourseForUser(courseA, b)).toBeNull();
    expect(getCourseForUser(courseA, a)).not.toBeNull();
  });
});

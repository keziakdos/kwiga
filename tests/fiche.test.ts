import { describe, it, expect, beforeEach } from "vitest";
import { getDb } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createCourse } from "@/lib/courses";
import { generateFiche, getSavedFiche } from "@/lib/fiche";

const db = () => getDb();

async function makeUser(username: string): Promise<number> {
  const hash = await hashPassword("MotDePasseTest123");
  const res = db()
    .prepare("INSERT INTO users (username, display_name, password_hash) VALUES (?, ?, ?)")
    .run(username, username, hash);
  return Number(res.lastInsertRowid);
}

beforeEach(() => {
  db().exec("DELETE FROM notion_fiches; DELETE FROM notions; DELETE FROM courses; DELETE FROM users;");
});

describe("fiche visuelle", () => {
  it("génère une fiche de secours sans IA, la sauvegarde et la relit", async () => {
    const userId = await makeUser("fiche1");
    const courseId = createCourse({ userId, title: "Réseaux", domain: "reseau", level: "debutant", goal: "Objectif de test" });
    const notionRes = db()
      .prepare(
        "INSERT INTO notions (course_id, title, summary, explanation, example) VALUES (?, 'IPv4', 'Résumé IPv4', 'Une adresse fait 32 bits. Le masque sépare réseau et hôte.', '192.168.1.10/24')",
      )
      .run(courseId);
    const notionId = Number(notionRes.lastInsertRowid);
    const notion = db()
      .prepare("SELECT id, title, summary, explanation, example, diagram FROM notions WHERE id = ?")
      .get(notionId) as { id: number; title: string; summary: string | null; explanation: string | null; example: string | null; diagram: string | null };

    const content = await generateFiche({ userId, courseId, notion });
    expect(content.title).toBe("IPv4");
    expect(content.keyPoints.length).toBeGreaterThan(0);
    expect(content.aiGenerated).toBe(false);

    const saved = getSavedFiche(userId, notionId);
    expect(saved?.content.title).toBe("IPv4");
    expect(saved?.content.keyPoints.length).toBe(content.keyPoints.length);
  });
});

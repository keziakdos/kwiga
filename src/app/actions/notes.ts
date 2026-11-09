"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { recordActivity, recomputeNotionMastery } from "@/lib/progress";

export type NoteState = { ok: boolean; message?: string; error?: string };

export async function saveNotionNoteAction(_prev: NoteState, formData: FormData): Promise<NoteState> {
  const user = await requireUser();
  const notionId = Number(formData.get("notion_id"));
  const courseId = Number(formData.get("course_id"));
  const content = String(formData.get("content") ?? "").slice(0, 20000);

  const db = getDb();
  const owns = db
    .prepare(
      `SELECT n.id FROM notions n JOIN courses c ON c.id = n.course_id
       WHERE n.id = ? AND c.id = ? AND c.user_id = ?`,
    )
    .get(notionId, courseId, user.id);
  if (!owns) return { ok: false, error: "Notion introuvable." };

  db.prepare(
    `INSERT INTO notion_notes (user_id, notion_id, content, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, notion_id) DO UPDATE SET content = excluded.content, updated_at = datetime('now')`,
  ).run(user.id, notionId, content);

  recordActivity({ userId: user.id, courseId, notionId, type: "note", label: "Note personnelle enregistrée" });
  revalidatePath(`/parcours/${courseId}/salle/${notionId}`);
  return { ok: true, message: "Note enregistrée." };
}

export async function markNotionAction(formData: FormData) {
  const user = await requireUser();
  const notionId = Number(formData.get("notion_id"));
  const courseId = Number(formData.get("course_id"));
  const action = String(formData.get("action"));
  const db = getDb();
  const owns = db
    .prepare(
      `SELECT n.id FROM notions n JOIN courses c ON c.id = n.course_id
       WHERE n.id = ? AND c.id = ? AND c.user_id = ?`,
    )
    .get(notionId, courseId, user.id);
  if (!owns) return;

  if (action === "a_revoir") {
    db.prepare(
      `INSERT INTO notion_progress (user_id, notion_id, status, last_studied_at, updated_at)
       VALUES (?, ?, 'a_revoir', datetime('now'), datetime('now'))
       ON CONFLICT(user_id, notion_id) DO UPDATE SET status = 'a_revoir', updated_at = datetime('now')`,
    ).run(user.id, notionId);
    db.prepare(
      "INSERT INTO revisions (user_id, notion_id, due_at, reason, done) VALUES (?, ?, ?, 'Marqué à revoir', 0)",
    ).run(user.id, notionId, new Date(Date.now() + 86400_000).toISOString());
  } else {
    db.prepare(
      `INSERT INTO notion_progress (user_id, notion_id, status, last_studied_at, updated_at)
       VALUES (?, ?, 'etudie', datetime('now'), datetime('now'))
       ON CONFLICT(user_id, notion_id) DO UPDATE SET status = 'etudie', updated_at = datetime('now')`,
    ).run(user.id, notionId);
    // Si des évaluations existaient déjà, la maîtrise peut maintenant être calculée.
    recomputeNotionMastery(user.id, notionId);
  }
  recordActivity({ userId: user.id, courseId, notionId, type: "notion", label: "Statut de la notion mis à jour" });
  revalidatePath(`/parcours/${courseId}/salle/${notionId}`);
}

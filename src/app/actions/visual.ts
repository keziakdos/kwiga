"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { setNotionStatus, recomputeNotionMastery, recordActivity } from "@/lib/progress";

export type VisualState = { ok: boolean; error?: string };

async function assertNotionOwnership(userId: number, courseId: number, notionId: number) {
  const db = getDb();
  return db
    .prepare(
      `SELECT n.id FROM notions n JOIN courses c ON c.id = n.course_id
       WHERE n.id = ? AND c.id = ? AND c.user_id = ?`,
    )
    .get(notionId, courseId, userId) as { id: number } | undefined;
}

export async function markCardUnderstoodAction(input: {
  courseId: number;
  notionId: number;
  understood: boolean;
}): Promise<VisualState> {
  const user = await requireUser();
  if (!(await assertNotionOwnership(user.id, input.courseId, input.notionId))) {
    return { ok: false, error: "Notion introuvable." };
  }
  setNotionStatus(user.id, input.notionId, input.understood ? "etudie" : "a_revoir");
  if (input.understood) recomputeNotionMastery(user.id, input.notionId);
  recordActivity({
    userId: user.id,
    courseId: input.courseId,
    notionId: input.notionId,
    type: "visuel",
    label: input.understood ? "Carte comprise" : "Carte marquée à revoir",
  });
  revalidatePath(`/parcours/${input.courseId}/visuel`);
  revalidatePath(`/parcours/${input.courseId}/salle/${input.notionId}`);
  return { ok: true };
}

export async function generateImageDirectAction(input: {
  courseId: number;
  notionId: number;
  prompt: string;
}): Promise<{ ok: boolean; error?: string; image?: { id: number; url: string } }> {
  const user = await requireUser();
  const db = getDb();
  const notion = db
    .prepare(
      `SELECT n.id, n.title, n.summary FROM notions n
       JOIN courses c ON c.id = n.course_id
       WHERE n.id = ? AND c.id = ? AND c.user_id = ?`,
    )
    .get(input.notionId, input.courseId, user.id) as { id: number; title: string; summary: string | null } | undefined;
  if (!notion) return { ok: false, error: "Notion introuvable." };

  const { generateIllustration } = await import("@/lib/images");
  const { BudgetError } = await import("@/lib/budget");
  const { ImageNotConfiguredError, ImageProviderError } = await import("@/lib/images");

  try {
    const image = await generateIllustration({
      userId: user.id,
      courseId: input.courseId,
      notion,
      extraPrompt: input.prompt.slice(0, 900),
    });
    recordActivity({
      userId: user.id,
      courseId: input.courseId,
      notionId: input.notionId,
      type: "image",
      label: "Illustration générée (révision visuelle)",
    });
    revalidatePath(`/parcours/${input.courseId}/visuel`);
    revalidatePath(`/parcours/${input.courseId}/salle/${input.notionId}/fiche`);
    return { ok: true, image: { id: image.id, url: image.url } };
  } catch (error) {
    if (error instanceof ImageNotConfiguredError) return { ok: false, error: error.message };
    if (error instanceof BudgetError) return { ok: false, error: error.message };
    if (error instanceof ImageProviderError) return { ok: false, error: error.message };
    return { ok: false, error: "La génération de l'illustration a échoué." };
  }
}

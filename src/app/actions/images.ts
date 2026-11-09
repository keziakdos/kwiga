"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { getDb } from "@/lib/db";
import { generateIllustration, deleteNotionImage, ImageNotConfiguredError, ImageProviderError } from "@/lib/images";
import { BudgetError } from "@/lib/budget";
import { recordActivity } from "@/lib/progress";

export type ImageState = { ok: boolean; error?: string; message?: string; image?: { id: number; url: string } };

export async function generateImageAction(_prev: ImageState, formData: FormData): Promise<ImageState> {
  const user = await requireUser();
  const courseId = Number(formData.get("course_id"));
  const notionId = Number(formData.get("notion_id"));
  const extraPrompt = String(formData.get("prompt") ?? "").slice(0, 800);

  const db = getDb();
  const notion = db
    .prepare(
      `SELECT n.id, n.title, n.summary FROM notions n
       JOIN courses c ON c.id = n.course_id
       WHERE n.id = ? AND c.id = ? AND c.user_id = ?`,
    )
    .get(notionId, courseId, user.id) as { id: number; title: string; summary: string | null } | undefined;
  if (!notion) return { ok: false, error: "Notion introuvable." };

  try {
    const image = await generateIllustration({ userId: user.id, courseId, notion, extraPrompt });
    recordActivity({
      userId: user.id,
      courseId,
      notionId,
      type: "image",
      label: "Illustration générée",
    });
    revalidatePath(`/parcours/${courseId}/salle/${notionId}/fiche`);
    revalidatePath(`/parcours/${courseId}/visuel`);
    return { ok: true, message: "Illustration générée et enregistrée.", image: { id: image.id, url: image.url } };
  } catch (error) {
    if (error instanceof ImageNotConfiguredError) return { ok: false, error: error.message };
    if (error instanceof BudgetError) return { ok: false, error: error.message };
    if (error instanceof ImageProviderError) return { ok: false, error: error.message };
    return { ok: false, error: "La génération de l'illustration a échoué. Réessayez plus tard." };
  }
}

export async function deleteImageAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("course_id"));
  const notionId = Number(formData.get("notion_id"));
  const imageId = Number(formData.get("image_id"));
  deleteNotionImage(user.id, imageId);
  revalidatePath(`/parcours/${courseId}/salle/${notionId}/fiche`);
}

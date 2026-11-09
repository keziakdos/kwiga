"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { generateFiche, type FicheVariant } from "@/lib/fiche";
import { recordActivity } from "@/lib/progress";

const VARIANTS: FicheVariant[] = ["standard", "analogie", "simple"];

export async function generateFicheAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("course_id"));
  const notionId = Number(formData.get("notion_id"));
  const rawVariant = String(formData.get("variant") ?? "standard");
  const variant: FicheVariant = VARIANTS.includes(rawVariant as FicheVariant)
    ? (rawVariant as FicheVariant)
    : "standard";

  const db = getDb();
  const notion = db
    .prepare(
      `SELECT n.id, n.title, n.summary, n.explanation, n.example, n.diagram
       FROM notions n JOIN courses c ON c.id = n.course_id
       WHERE n.id = ? AND n.course_id = ? AND c.user_id = ?`,
    )
    .get(notionId, courseId, user.id) as
    | { id: number; title: string; summary: string | null; explanation: string | null; example: string | null; diagram: string | null }
    | undefined;

  if (!notion) redirect("/parcours");

  await generateFiche({ userId: user.id, courseId, notion, variant });
  recordActivity({
    userId: user.id,
    courseId,
    notionId,
    type: "fiche",
    label:
      variant === "standard"
        ? "Fiche visuelle générée"
        : variant === "analogie"
          ? "Nouvelle explication (analogie) générée"
          : "Explication simplifiée générée",
  });
  revalidatePath(`/parcours/${courseId}/salle/${notionId}/fiche`);
  redirect(`/parcours/${courseId}/salle/${notionId}/fiche`);
}

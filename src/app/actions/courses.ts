"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/session";
import {
  createCourse,
  activateCourse,
  archiveCourse,
  reactivateCourse,
  getCourseForUser,
  LimitError,
  type Domain,
  type Level,
} from "@/lib/courses";
import { getPlanForCourse, materializePlan, type PlanContent } from "@/lib/plans";
import { generatePlan } from "@/lib/plans-ai";
import { recordActivity } from "@/lib/progress";
import { deleteFileQuietly } from "@/lib/storage";
import { clampText, DOMAINS, LEVELS } from "@/lib/validation";

export type CourseFormState = { error?: string };

export async function createCourseAction(_prev: CourseFormState, formData: FormData): Promise<CourseFormState> {
  const user = await requireUser();
  const title = clampText(formData.get("title"), 160);
  const domain = String(formData.get("domain") ?? "");
  const level = String(formData.get("level") ?? "");
  const goal = clampText(formData.get("goal"), 2000);
  const targetDuration = clampText(formData.get("target_duration"), 80);

  if (title.length < 3) return { error: "Le titre doit contenir au moins 3 caractères." };
  if (!DOMAINS.some((d) => d.value === domain)) return { error: "Domaine invalide." };
  if (!LEVELS.some((l) => l.value === level)) return { error: "Niveau invalide." };
  if (goal.length < 10) return { error: "Décrivez votre objectif en quelques mots (10 caractères minimum)." };

  let courseId: number;
  try {
    courseId = createCourse({
      userId: user.id,
      title,
      domain: domain as Domain,
      level: level as Level,
      goal,
      targetDuration,
    });
  } catch (e) {
    return { error: e instanceof LimitError ? e.message : "Impossible de créer le parcours." };
  }

  recordActivity({ userId: user.id, courseId, type: "parcours", label: `Création du parcours « ${title} »` });
  redirect(`/parcours/${courseId}`);
}

export async function generatePlanAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("course_id"));
  const course = getCourseForUser(courseId, user.id);
  if (!course) redirect("/parcours");

  await generatePlan({
    userId: user.id,
    courseId,
    title: String(course.title),
    domain: String(course.domain),
    level: String(course.level),
    goal: String(course.goal),
  });
  revalidatePath(`/parcours/${courseId}`);
  redirect(`/parcours/${courseId}`);
}

export async function validatePlanAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("course_id"));
  const course = getCourseForUser(courseId, user.id);
  if (!course) redirect("/parcours");
  const plan = getPlanForCourse(courseId);
  if (!plan || plan.status !== "proposed") {
    redirect(`/parcours/${courseId}`);
  }
  const content = JSON.parse(plan.content_json) as PlanContent;
  materializePlan(courseId, plan.id, content);
  recordActivity({ userId: user.id, courseId, type: "plan", label: "Plan d'apprentissage validé" });
  revalidatePath(`/parcours/${courseId}`);
  revalidatePath("/tableau-de-bord");
  redirect(`/parcours/${courseId}`);
}

export async function regeneratePlanAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("course_id"));
  const course = getCourseForUser(courseId, user.id);
  if (!course) redirect("/parcours");
  await generatePlan({
    userId: user.id,
    courseId,
    title: String(course.title),
    domain: String(course.domain),
    level: String(course.level),
    goal: String(course.goal),
  });
  revalidatePath(`/parcours/${courseId}`);
  redirect(`/parcours/${courseId}`);
}

export async function archiveCourseAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("course_id"));
  archiveCourse(user.id, courseId);
  revalidatePath("/parcours");
  revalidatePath("/tableau-de-bord");
  redirect("/parcours");
}

export async function reactivateCourseAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("course_id"));
  try {
    reactivateCourse(user.id, courseId);
  } catch (e) {
    revalidatePath("/parcours");
    redirect(`/parcours?erreur=${encodeURIComponent(e instanceof Error ? e.message : "Réactivation impossible")}`);
  }
  revalidatePath("/parcours");
  redirect("/parcours");
}

export async function deleteCourseAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("course_id"));
  const confirm = String(formData.get("confirm") ?? "");
  const course = getCourseForUser(courseId, user.id);
  if (!course) redirect("/parcours");
  if (confirm !== "SUPPRIMER") {
    redirect(`/parcours/${courseId}?erreur=${encodeURIComponent("Confirmation requise")}`);
  }
  const db = getDb();
  const docs = db.prepare("SELECT storage_path FROM documents WHERE course_id = ? AND user_id = ?").all(courseId, user.id) as Array<{ storage_path: string | null }>;
  db.prepare("DELETE FROM courses WHERE id = ? AND user_id = ?").run(courseId, user.id);
  for (const d of docs) deleteFileQuietly(d.storage_path);
  revalidatePath("/parcours");
  revalidatePath("/tableau-de-bord");
  redirect("/parcours");
}

export async function setCurrentNotionAction(formData: FormData) {
  const user = await requireUser();
  const courseId = Number(formData.get("course_id"));
  const notionId = Number(formData.get("notion_id"));
  const course = getCourseForUser(courseId, user.id);
  if (course) {
    getDb().prepare("UPDATE courses SET current_notion_id = ? WHERE id = ? AND user_id = ?").run(notionId, courseId, user.id);
  }
  redirect(`/parcours/${courseId}/salle/${notionId}`);
}

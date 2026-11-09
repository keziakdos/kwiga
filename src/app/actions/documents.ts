"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { config } from "@/lib/config";
import { getCourseForUser } from "@/lib/courses";
import { saveBuffer, saveText, sha256, deleteFileQuietly } from "@/lib/storage";
import { enqueueJob } from "@/lib/jobs";
import { recordActivity } from "@/lib/progress";
import { clampText } from "@/lib/validation";

export type DocumentState = { error?: string; success?: string };

const MAX_UPLOADS = () => config.limits.maxUploadsPerUser;

export async function uploadPdfAction(_prev: DocumentState, formData: FormData): Promise<DocumentState> {
  const user = await requireUser();
  const courseId = Number(formData.get("course_id"));
  const course = getCourseForUser(courseId, user.id);
  if (!course) return { error: "Parcours introuvable." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Sélectionnez un fichier PDF." };

  const maxBytes = config.limits.maxPdfMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return { error: `Fichier trop volumineux (limite ${config.limits.maxPdfMb} Mo).` };
  }
  const name = file.name.slice(0, 200);
  if (!/\.pdf$/i.test(name) || (file.type && file.type !== "application/pdf")) {
    return { error: "Seuls les fichiers PDF sont acceptés." };
  }

  const db = getDb();
  const count = db
    .prepare("SELECT COUNT(*) AS n FROM documents WHERE user_id = ?")
    .get(user.id) as { n: number };
  if (count.n >= MAX_UPLOADS()) {
    return { error: `Limite de ${MAX_UPLOADS()} documents atteinte. Supprimez un document ancien.` };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
    return { error: "Le fichier ne semble pas être un PDF valide." };
  }

  const storagePath = saveBuffer(user.id, name, buffer);
  const hash = sha256(buffer);
  const res = db
    .prepare(
      `INSERT INTO documents (user_id, course_id, kind, original_name, mime, size_bytes, sha256, storage_path, status)
       VALUES (?, ?, 'pdf', ?, ?, ?, ?, ?, 'pending')`,
    )
    .run(user.id, courseId, name, "application/pdf", buffer.length, hash, storagePath);

  enqueueJob("extract_document", { documentId: Number(res.lastInsertRowid) });
  recordActivity({ userId: user.id, courseId, type: "document", label: `Import du PDF « ${name} »` });
  revalidatePath(`/parcours/${courseId}`);
  return { success: "PDF importé. Extraction du texte en cours…" };
}

export async function addNotesAction(_prev: DocumentState, formData: FormData): Promise<DocumentState> {
  const user = await requireUser();
  const courseId = Number(formData.get("course_id"));
  const course = getCourseForUser(courseId, user.id);
  if (!course) return { error: "Parcours introuvable." };

  const title = clampText(formData.get("title"), 160) || "Notes personnelles";
  const text = String(formData.get("text") ?? "").trim();
  if (text.length < 20) return { error: "Les notes doivent contenir au moins 20 caractères." };
  const maxBytes = config.limits.maxNotesKb * 1024;
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    return { error: `Notes trop longues (limite ${config.limits.maxNotesKb} Ko).` };
  }

  const db = getDb();
  const count = db.prepare("SELECT COUNT(*) AS n FROM documents WHERE user_id = ?").get(user.id) as { n: number };
  if (count.n >= MAX_UPLOADS()) {
    return { error: `Limite de ${MAX_UPLOADS()} documents atteinte.` };
  }

  const storagePath = saveText(user.id, title, text);
  const res = db
    .prepare(
      `INSERT INTO documents (user_id, course_id, kind, original_name, mime, size_bytes, storage_path, status)
       VALUES (?, ?, 'notes', ?, 'text/plain', ?, ?, 'pending')`,
    )
    .run(user.id, courseId, title, Buffer.byteLength(text, "utf8"), storagePath);

  enqueueJob("extract_document", { documentId: Number(res.lastInsertRowid) });
  recordActivity({ userId: user.id, courseId, type: "document", label: `Ajout des notes « ${title} »` });
  revalidatePath(`/parcours/${courseId}`);
  return { success: "Notes enregistrées. Découpage en cours…" };
}

export async function deleteDocumentAction(formData: FormData) {
  const user = await requireUser();
  const documentId = Number(formData.get("document_id"));
  const db = getDb();
  const doc = db
    .prepare("SELECT id, course_id, storage_path FROM documents WHERE id = ? AND user_id = ?")
    .get(documentId, user.id) as { id: number; course_id: number; storage_path: string | null } | undefined;
  if (!doc) redirect("/parcours");
  db.prepare("DELETE FROM documents WHERE id = ? AND user_id = ?").run(documentId, user.id);
  deleteFileQuietly(doc.storage_path);
  revalidatePath(`/parcours/${doc.course_id}`);
  redirect(`/parcours/${doc.course_id}`);
}

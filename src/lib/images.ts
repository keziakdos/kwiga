import { config, imageConfigured } from "./config";
import { getDb } from "./db";
import { reserveCost, settleCost, failReservation } from "./budget";
import { saveBuffer, readFileBuffer, deleteFileQuietly } from "./storage";
import { logError } from "./jobs";

export class ImageNotConfiguredError extends Error {
  constructor() {
    super(
      "La génération d'images n'est pas configurée. L'administrateur doit activer la facturation Google et renseigner IMAGE_PROVIDER, IMAGE_MODEL et IMAGE_API_KEY.",
    );
  }
}

export class ImageProviderError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

export type NotionImage = {
  id: number;
  notion_id: number;
  mime: string;
  prompt: string | null;
  model: string | null;
  created_at: string;
  url: string;
};

export function listNotionImages(userId: number, notionId: number): NotionImage[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, notion_id, mime, prompt, model, created_at FROM notion_images
       WHERE user_id = ? AND notion_id = ? ORDER BY id DESC`,
    )
    .all(userId, notionId) as Array<Omit<NotionImage, "url">>;
  return rows.map((r) => ({ ...r, url: `/api/images/${r.id}` }));
}

export function countNotionImages(userId: number, notionId: number): number {
  const db = getDb();
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM notion_images WHERE user_id = ? AND notion_id = ?")
    .get(userId, notionId) as { n: number };
  return row.n;
}

export function getNotionImageForUser(userId: number, imageId: number) {
  const db = getDb();
  return db
    .prepare("SELECT id, user_id, notion_id, storage_path, mime FROM notion_images WHERE id = ? AND user_id = ?")
    .get(imageId, userId) as
    | { id: number; user_id: number; notion_id: number; storage_path: string; mime: string }
    | undefined;
}

export function readNotionImage(storagePath: string): Buffer {
  return readFileBuffer(storagePath);
}

export function deleteNotionImage(userId: number, imageId: number) {
  const db = getDb();
  const row = db
    .prepare("SELECT storage_path FROM notion_images WHERE id = ? AND user_id = ?")
    .get(imageId, userId) as { storage_path: string } | undefined;
  if (!row) return;
  db.prepare("DELETE FROM notion_images WHERE id = ? AND user_id = ?").run(imageId, userId);
  deleteFileQuietly(row.storage_path);
}

type InlineImage = { data: string; mime: string };

function findInlineImage(node: unknown, depth = 0): InlineImage | null {
  if (!node || typeof node !== "object" || depth > 6) return null;
  const obj = node as Record<string, unknown>;
  const mime =
    (typeof obj.mime_type === "string" && obj.mime_type) ||
    (typeof obj.mimeType === "string" && obj.mimeType) ||
    (typeof obj.mime === "string" && obj.mime) ||
    "";
  if (typeof obj.data === "string" && mime.startsWith("image/")) {
    return { data: obj.data, mime };
  }
  if (obj.inlineData && typeof obj.inlineData === "object") {
    const inline = obj.inlineData as { data?: unknown; mimeType?: unknown };
    if (typeof inline.data === "string" && typeof inline.mimeType === "string") {
      return { data: inline.data, mime: inline.mimeType };
    }
  }
  for (const value of Object.values(obj)) {
    const found = findInlineImage(value, depth + 1);
    if (found) return found;
  }
  return null;
}

async function requestGoogleImage(prompt: string): Promise<InlineImage> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": config.images.apiKey,
        "Api-Revision": "2026-05-20",
      },
      body: JSON.stringify({
        model: config.images.model,
        input: [{ type: "text", text: prompt }],
      }),
      signal: controller.signal,
    });
    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }
    if (!res.ok) {
      const body =
        parsed && typeof parsed === "object" && "error" in parsed
          ? JSON.stringify((parsed as { error: unknown }).error).slice(0, 400)
          : text.slice(0, 400);
      const hint =
        res.status === 403 || res.status === 400
          ? " Vérifiez que la facturation Google est activée et que le modèle image est autorisé pour cette clé."
          : "";
      throw new ImageProviderError(`Erreur Google (${res.status}) : ${body}.${hint}`, res.status);
    }
    const image = findInlineImage(parsed);
    if (!image) {
      throw new ImageProviderError("La réponse Google ne contient pas d'image exploitable.");
    }
    return image;
  } finally {
    clearTimeout(timer);
  }
}

function buildPrompt(params: { notionTitle: string; notionSummary: string | null; extraPrompt: string }): string {
  return `Crée une illustration pédagogique claire et légendée en français pour expliquer « ${params.notionTitle} » à un débutant en réseaux informatiques.
${params.notionSummary ? `Contexte : ${params.notionSummary}\n` : ""}Style : schéma technique moderne, fond clair, ordinateurs / switch / routeur / serveur quand c'est pertinent, flèches de communication, couleurs sobres, textes en français courts et lisibles.
Évite le texte inventé, les logos de marques et les détails décoratifs inutiles.
${params.extraPrompt ? `Demande complémentaire : ${params.extraPrompt}` : ""}`;
}

export async function generateIllustration(params: {
  userId: number;
  courseId: number;
  notion: { id: number; title: string; summary: string | null };
  extraPrompt?: string;
}): Promise<NotionImage> {
  if (!imageConfigured()) throw new ImageNotConfiguredError();

  const existing = countNotionImages(params.userId, params.notion.id);
  if (existing >= config.images.maxPerNotion) {
    throw new ImageProviderError(
      `Limite de ${config.images.maxPerNotion} illustrations par notion atteinte. Supprimez-en une avant d'en générer une nouvelle.`,
    );
  }

  const prompt = buildPrompt({
    notionTitle: params.notion.title,
    notionSummary: params.notion.summary,
    extraPrompt: (params.extraPrompt ?? "").slice(0, 800),
  });

  const cost = config.images.costEurPerImage;
  const reservationId = reserveCost(params.userId, "image", cost);

  try {
    const image = await requestGoogleImage(prompt);
    const buffer = Buffer.from(image.data, "base64");
    if (buffer.length < 100) throw new ImageProviderError("Image générée vide ou invalide.");

    const ext = image.mime.includes("jpeg") ? "jpg" : image.mime.includes("webp") ? "webp" : "png";
    const storagePath = saveBuffer(params.userId, `illustration-${params.notion.id}.${ext}`, buffer);

    const db = getDb();
    const res = db
      .prepare(
        `INSERT INTO notion_images (user_id, notion_id, storage_path, mime, prompt, provider, model)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        params.userId,
        params.notion.id,
        storagePath,
        image.mime,
        prompt.slice(0, 2000),
        "google",
        config.images.model,
      );

    settleCost({
      reservationId,
      userId: params.userId,
      courseId: params.courseId,
      operation: "image_generation",
      provider: "google",
      model: config.images.model,
      inputTokens: 0,
      outputTokens: 0,
      costEur: cost,
    });

    return {
      id: Number(res.lastInsertRowid),
      notion_id: params.notion.id,
      mime: image.mime,
      prompt: prompt.slice(0, 2000),
      model: config.images.model,
      created_at: new Date().toISOString(),
      url: `/api/images/${Number(res.lastInsertRowid)}`,
    };
  } catch (error) {
    failReservation(reservationId, false);
    logError(error instanceof Error ? error.message : "Erreur de génération d'image", {
      notionId: params.notion.id,
      provider: "google",
      model: config.images.model,
    });
    throw error;
  }
}

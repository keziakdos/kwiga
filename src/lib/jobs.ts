import { getDb, nowIso } from "./db";
import { config } from "./config";
import { readFileBuffer } from "./storage";
import { extractPdf } from "./pdf";
import { chunkNotes, chunkText } from "./text";

export type JobPayload = { documentId: number };

export function enqueueJob(type: string, payload: object): number {
  const db = getDb();
  const res = db
    .prepare("INSERT INTO jobs (type, payload_json) VALUES (?, ?)")
    .run(type, JSON.stringify(payload));
  kickWorker();
  return Number(res.lastInsertRowid);
}

export function logError(message: string, context?: Record<string, unknown>) {
  try {
    getDb()
      .prepare("INSERT INTO error_logs (level, message, context_json) VALUES ('error', ?, ?)")
      .run(message.slice(0, 800), JSON.stringify(context ?? {}).slice(0, 3000));
  } catch {
    // silencieux
  }
}

function claimNextJob():
  | { id: number; type: string; payload_json: string; attempts: number }
  | undefined {
  const db = getDb();
  const tx = db.transaction(() => {
    const job = db
      .prepare("SELECT id, type, payload_json, attempts FROM jobs WHERE status = 'pending' ORDER BY id LIMIT 1")
      .get() as { id: number; type: string; payload_json: string; attempts: number } | undefined;
    if (!job) return undefined;
    db.prepare("UPDATE jobs SET status = 'running', attempts = attempts + 1, updated_at = ? WHERE id = ?").run(
      nowIso(),
      job.id,
    );
    return job;
  });
  return tx.immediate();
}

function finishJob(id: number, status: "done" | "error", error?: string) {
  const db = getDb();
  db.prepare("UPDATE jobs SET status = ?, last_error = ?, updated_at = ? WHERE id = ?").run(
    status,
    error ?? null,
    nowIso(),
    id,
  );
}

async function processDocumentJob(documentId: number) {
  const db = getDb();
  const doc = db
    .prepare("SELECT * FROM documents WHERE id = ?")
    .get(documentId) as
    | {
        id: number;
        kind: "pdf" | "notes";
        storage_path: string | null;
        status: string;
      }
    | undefined;
  if (!doc) throw new Error("Document introuvable");
  if (doc.status === "done") return;

  db.prepare("UPDATE documents SET status = 'processing', error_message = NULL, updated_at = ? WHERE id = ?").run(
    nowIso(),
    documentId,
  );

  try {
    if (!doc.storage_path) throw new Error("Fichier source manquant");
    const buffer = readFileBuffer(doc.storage_path);

    if (doc.kind === "pdf") {
      const extraction = await extractPdf(buffer, config.limits.maxPdfPages);
      if (extraction.likelyScanned) {
        throw new Error(
          "Ce PDF ne contient pas de texte exploitable (document probablement scanné). L'OCR n'est pas activé. Fournissez un PDF textuel ou saisissez des notes.",
        );
      }
      const insertPage = db.prepare(
        "INSERT INTO document_pages (document_id, page_number, content) VALUES (?, ?, ?)",
      );
      const insertChunk = db.prepare(
        "INSERT INTO document_chunks (document_id, page_number, seq, content) VALUES (?, ?, ?, ?)",
      );
      const apply = db.transaction(() => {
        db.prepare("DELETE FROM document_pages WHERE document_id = ?").run(documentId);
        db.prepare("DELETE FROM document_chunks WHERE document_id = ?").run(documentId);
        let seq = 0;
        for (const page of extraction.pages) {
          insertPage.run(documentId, page.pageNumber, page.text);
          for (const chunk of chunkText(page.text, page.pageNumber, seq)) {
            insertChunk.run(documentId, chunk.pageNumber, chunk.seq, chunk.content);
            seq = chunk.seq + 1;
          }
        }
        db.prepare(
          "UPDATE documents SET status = 'done', page_count = ?, updated_at = ? WHERE id = ?",
        ).run(extraction.pageCount, nowIso(), documentId);
      });
      apply();
      return;
    }

    const text = buffer.toString("utf8");
    const chunks = chunkNotes(text);
    if (chunks.length === 0) throw new Error("Les notes sont vides.");
    const insertChunk = db.prepare(
      "INSERT INTO document_chunks (document_id, page_number, seq, content) VALUES (?, ?, ?, ?)",
    );
    const apply = db.transaction(() => {
      db.prepare("DELETE FROM document_chunks WHERE document_id = ?").run(documentId);
      for (const chunk of chunks) {
        insertChunk.run(documentId, null, chunk.seq, chunk.content);
      }
      db.prepare("UPDATE documents SET status = 'done', page_count = 0, updated_at = ? WHERE id = ?").run(
        nowIso(),
        documentId,
      );
    });
    apply();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur de traitement inconnue";
    db.prepare(
      "UPDATE documents SET status = 'error', error_message = ?, updated_at = ? WHERE id = ?",
    ).run(message.slice(0, 800), nowIso(), documentId);
    logError(message, { documentId });
    throw error;
  }
}

let running = false;

export async function drainJobs(max = 5): Promise<void> {
  if (running) return;
  running = true;
  try {
    for (let i = 0; i < max; i++) {
      const job = claimNextJob();
      if (!job) break;
      try {
        if (job.type === "extract_document") {
          const payload = JSON.parse(job.payload_json) as JobPayload;
          await processDocumentJob(payload.documentId);
        } else {
          throw new Error(`Type de tâche inconnu: ${job.type}`);
        }
        finishJob(job.id, "done");
      } catch (error) {
        finishJob(job.id, "error", error instanceof Error ? error.message : "erreur");
      }
    }
  } finally {
    running = false;
  }
}

let kickScheduled = false;
export function kickWorker() {
  if (kickScheduled) return;
  kickScheduled = true;
  setTimeout(() => {
    kickScheduled = false;
    void drainJobs();
  }, 50);
}

let interval: NodeJS.Timeout | null = null;
export function startWorker() {
  if (interval) return;
  interval = setInterval(() => void drainJobs(), 5000);
  if (typeof interval.unref === "function") interval.unref();
  void drainJobs();
}

import { getSessionUser } from "@/lib/session";
import { getDb } from "@/lib/db";
import { readFileBuffer } from "@/lib/storage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response("Non autorisé", { status: 401 });

  const documentId = Number((await params).id);
  if (!Number.isFinite(documentId)) return new Response("Requête invalide", { status: 400 });

  const db = getDb();
  const doc = db
    .prepare("SELECT id, user_id, original_name, mime, storage_path FROM documents WHERE id = ? AND user_id = ?")
    .get(documentId, user.id) as
    | { id: number; user_id: number; original_name: string; mime: string | null; storage_path: string | null }
    | undefined;
  if (!doc || !doc.storage_path) return new Response("Introuvable", { status: 404 });

  try {
    const buffer = readFileBuffer(doc.storage_path);
    const isPdf = (doc.mime ?? "").includes("pdf");
    return new Response(new Uint8Array(buffer), {
      headers: {
        "content-type": isPdf ? "application/pdf" : "text/plain; charset=utf-8",
        "content-disposition": `inline; filename="${encodeURIComponent(doc.original_name)}"`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response("Fichier indisponible", { status: 404 });
  }
}

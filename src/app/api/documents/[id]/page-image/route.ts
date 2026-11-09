import { getSessionUser } from "@/lib/session";
import { getDb } from "@/lib/db";
import { renderDocumentPage } from "@/lib/render";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response("Non autorisé", { status: 401 });

  const documentId = Number((await params).id);
  if (!Number.isFinite(documentId)) return new Response("Requête invalide", { status: 400 });

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  if (!Number.isFinite(page) || page < 1) return new Response("Page invalide", { status: 400 });

  const db = getDb();
  const doc = db
    .prepare(
      "SELECT id, kind, storage_path, page_count FROM documents WHERE id = ? AND user_id = ? AND status = 'done'",
    )
    .get(documentId, user.id) as
    | { id: number; kind: string; storage_path: string | null; page_count: number }
    | undefined;
  if (!doc || doc.kind !== "pdf" || !doc.storage_path) {
    return new Response("Image indisponible", { status: 404 });
  }

  try {
    const buffer = await renderDocumentPage(doc.id, doc.storage_path, page, doc.page_count);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "content-type": "image/png",
        "cache-control": "private, max-age=3600",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response("Rendu impossible", { status: 500 });
  }
}

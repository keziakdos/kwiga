import { getSessionUser } from "@/lib/session";
import { getDb } from "@/lib/db";
import { getSavedFiche, type FicheContent } from "@/lib/fiche";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function list(items: string[], ordered = false): string {
  if (items.length === 0) return "";
  const tag = ordered ? "ol" : "ul";
  return `<${tag}>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</${tag}>`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ notionId: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response("Non autorisé", { status: 401 });

  const notionId = Number((await params).notionId);
  if (!Number.isFinite(notionId)) return new Response("Requête invalide", { status: 400 });

  const db = getDb();
  const notion = db
    .prepare(
      `SELECT n.title FROM notions n JOIN courses c ON c.id = n.course_id
       WHERE n.id = ? AND c.user_id = ?`,
    )
    .get(notionId, user.id) as { title: string } | undefined;
  if (!notion) return new Response("Introuvable", { status: 404 });

  const saved = getSavedFiche(user.id, notionId);
  if (!saved) return new Response("Aucune fiche enregistrée", { status: 404 });
  const f: FicheContent = saved.content;

  const checkItems =
    f.checkItems && f.checkItems.length > 0
      ? f.checkItems
      : f.checkQuestions.map((q) => ({ question: q, answer: "" }));

  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(f.title)} — Fiche Kwiga</title>
<style>
  :root { color-scheme: light; }
  body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; max-width: 820px; margin: 0 auto; padding: 32px 20px 64px; color: #233028; background: #faf6ec; line-height: 1.6; }
  h1 { font-family: Georgia, serif; font-size: 32px; margin: 0 0 4px; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #14532d; margin: 24px 0 6px; }
  .meta { color: #7c8a80; font-size: 12px; }
  .card { background: #fff; border: 1px solid #e2d9c2; border-radius: 14px; padding: 18px; margin-top: 10px; }
  ul, ol { margin: 6px 0; padding-left: 22px; }
  li { margin: 4px 0; }
  pre { white-space: pre-wrap; background: #0f172a; color: #e2e8f0; padding: 12px; border-radius: 10px; font-size: 12px; }
  .q { font-weight: 600; }
  .a { color: #4b5a50; font-size: 14px; }
  .foot { margin-top: 28px; font-size: 11px; color: #7c8a80; border-top: 1px solid #e2d9c2; padding-top: 10px; }
  @media print { body { background: #fff; } .card { break-inside: avoid; } }
</style></head><body>
<h1>${esc(f.title)}</h1>
<p class="meta">Fiche Kwiga — mise à jour le ${esc(new Date(saved.updatedAt).toLocaleString("fr-FR"))}</p>
${f.intro ? `<h2>Idée principale</h2><p>${esc(f.intro)}</p>` : ""}
${f.keyPoints.length ? `<h2>Points clés</h2>${list(f.keyPoints)}` : ""}
${f.steps.length ? `<h2>Démarche pas à pas</h2>${list(f.steps, true)}` : ""}
${f.example ? `<h2>Exemple</h2><div class="card">${esc(f.example)}</div>` : ""}
${f.diagram ? `<h2>Schéma explicatif (code Mermaid)</h2><pre>${esc(f.diagram)}</pre>` : ""}
${checkItems.length ? `<h2>Vérifier sa compréhension</h2>${checkItems.map((c, i) => `<div class="card"><p class="q">${i + 1}. ${esc(c.question)}</p><p class="a">${esc(c.answer || "Réponse à formuler et à vérifier avec le tuteur.")}</p></div>`).join("")}` : ""}
${f.sources.length ? `<h2>Pages du document</h2><ul>${f.sources.map((s) => `<li>${esc(s.documentName)}${s.pageNumber ? ` — page ${s.pageNumber}` : ""}</li>`).join("")}</ul>` : ""}
<p class="foot">Kwiga est un outil pédagogique privé, sans certification officielle. Vérifiez les points importants dans le document source.</p>
</body></html>`;

  const filename = `kwiga-fiche-${notion.title.replace(/[^a-zA-Z0-9-_]+/g, "-").slice(0, 60)}.html`;
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
    },
  });
}

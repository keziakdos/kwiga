import fs from "node:fs";
import path from "node:path";
import { config } from "./config";
import { readFileBuffer } from "./storage";

const cacheDir = path.join(config.dataDir, "cache", "pages");

function cachePath(documentId: number, pageNumber: number): string {
  return path.join(cacheDir, `${documentId}-${pageNumber}.png`);
}

/**
 * Rend une page de PDF en PNG, avec cache disque. Sert uniquement à afficher
 * au apprenant les pages réelles de son document (références visuelles).
 */
export async function renderDocumentPage(
  documentId: number,
  storagePath: string,
  pageNumber: number,
  pageCount: number,
): Promise<Buffer> {
  if (!Number.isFinite(pageNumber) || pageNumber < 1 || (pageCount > 0 && pageNumber > pageCount)) {
    throw new Error("Numéro de page invalide");
  }

  const cached = cachePath(documentId, pageNumber);
  if (fs.existsSync(cached)) {
    return fs.readFileSync(cached);
  }

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { createCanvas } = await import("@napi-rs/canvas");
  const data = new Uint8Array(readFileBuffer(storagePath));
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  try {
    if (pageNumber > doc.numPages) throw new Error("Numéro de page invalide");
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.35 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext("2d");
    await page.render({
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
    } as Parameters<typeof page.render>[0]).promise;
    const buffer = canvas.toBuffer("image/png");
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(cached, buffer, { mode: 0o600 });
    page.cleanup();
    return buffer;
  } finally {
    await doc.destroy();
  }
}

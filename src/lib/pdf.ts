import { normalizeWhitespace } from "./text";

export type PdfPage = { pageNumber: number; text: string };

export type PdfExtraction = {
  pages: PdfPage[];
  totalCharacters: number;
  likelyScanned: boolean;
};

export async function extractPdf(buffer: Buffer, maxPages: number): Promise<PdfExtraction & { pageCount: number }> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(buffer);
  const doc = await pdfjs.getDocument({
    data,
    isEvalSupported: false,
    useSystemFonts: true,
  } as Parameters<typeof pdfjs.getDocument>[0]).promise;

  try {
    const pageCount = doc.numPages;
    if (pageCount > maxPages) {
      throw new Error(`Le PDF contient ${pageCount} pages, au-delà de la limite de ${maxPages}.`);
    }
    const pages: PdfPage[] = [];
    let totalCharacters = 0;
    for (let i = 1; i <= pageCount; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      totalCharacters += text.length;
      pages.push({ pageNumber: i, text: normalizeWhitespace(text) });
    }
    const avg = pageCount > 0 ? totalCharacters / pageCount : 0;
    const likelyScanned = totalCharacters < 80 || avg < 25;
    return { pages, totalCharacters, likelyScanned, pageCount };
  } finally {
    await doc.destroy();
  }
}

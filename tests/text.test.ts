import { describe, it, expect } from "vitest";
import { chunkText, chunkNotes, parseNotesSections, normalizeWhitespace } from "@/lib/text";

describe("découpage du texte", () => {
  it("découpe en morceaux avec chevauchement et numéro de page", () => {
    const text = "Phrase de test. ".repeat(200);
    const chunks = chunkText(text, 4);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.pageNumber === 4)).toBe(true);
    expect(chunks[0].content.length).toBeLessThanOrEqual(1200);
  });

  it("structure les notes par sections sans inventer de pagination", () => {
    const notes = "# Chapitre 1 — OSI\n\nLes 7 couches.\n\n# Chapitre 2 — IPv4\n\nLe masque.";
    const sections = parseNotesSections(notes);
    expect(sections).toHaveLength(2);
    expect(sections[0].title).toContain("OSI");
    const chunks = chunkNotes(notes);
    expect(chunks.every((c) => c.pageNumber === null)).toBe(true);
    expect(chunks[0].content).toContain("OSI");
  });

  it("normalise les espaces sans perdre le contenu", () => {
    expect(normalizeWhitespace("a\r\n\r\n\r\nb   \n")).toBe("a\n\nb");
  });
});

import { describe, it, expect } from "vitest";
import { cleanMermaid, isLikelyMermaid } from "@/lib/mermaid";

describe("nettoyage Mermaid", () => {
  it("retire les blocs Markdown et normalise les flèches", () => {
    const input = "```mermaid\nflowchart TD\n  A[PC] → B[Switch]\n```";
    const cleaned = cleanMermaid(input);
    expect(cleaned.startsWith("flowchart TD")).toBe(true);
    expect(cleaned).toContain("A[PC] --> B[Switch]");
    expect(cleaned).not.toContain("```");
  });

  it("rejette un contenu qui n'est pas du Mermaid", () => {
    expect(isLikelyMermaid("Voici un schéma : PC -> serveur")).toBe(false);
    expect(cleanMermaid("")).toBe("");
    expect(isLikelyMermaid("graph TD\n A-->B")).toBe(true);
  });
});

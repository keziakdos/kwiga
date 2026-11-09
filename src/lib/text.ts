export type TextChunk = { content: string; pageNumber: number | null; seq: number; sectionTitle?: string | null };

const MAX_CHUNK = 1100;
const OVERLAP = 180;

export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function chunkText(text: string, pageNumber: number | null, startSeq = 0): TextChunk[] {
  const clean = normalizeWhitespace(text);
  if (!clean) return [];
  const chunks: TextChunk[] = [];
  let start = 0;
  let seq = startSeq;
  while (start < clean.length) {
    let end = Math.min(clean.length, start + MAX_CHUNK);
    if (end < clean.length) {
      const slice = clean.slice(start, end);
      const lastBreak = Math.max(slice.lastIndexOf("\n"), slice.lastIndexOf(". "));
      if (lastBreak > MAX_CHUNK * 0.5) end = start + lastBreak + 1;
    }
    const content = clean.slice(start, end).trim();
    if (content) {
      chunks.push({ content, pageNumber, seq: seq++ });
    }
    if (end >= clean.length) break;
    start = Math.max(end - OVERLAP, start + 1);
  }
  return chunks;
}

export type NoteSection = { title: string | null; content: string };

export function parseNotesSections(input: string): NoteSection[] {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const sections: NoteSection[] = [];
  let currentTitle: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    const content = buffer.join("\n").trim();
    if (content) sections.push({ title: currentTitle, content });
    buffer = [];
  };

  for (const line of lines) {
    const heading = line.match(/^#{1,6}\s+(.*)$/) || line.match(/^(?:chapitre|section|partie|module)\s+\d+\s*[:\-–]\s*(.*)$/i);
    if (heading) {
      flush();
      currentTitle = heading[1]?.trim() || null;
      continue;
    }
    buffer.push(line);
  }
  flush();

  if (sections.length === 0) {
    const content = input.trim();
    if (content) return [{ title: null, content }];
  }
  return sections;
}

export function chunkNotes(input: string): TextChunk[] {
  const sections = parseNotesSections(input);
  const chunks: TextChunk[] = [];
  let seq = 0;
  for (const section of sections) {
    const prefix = section.title ? `${section.title}\n\n` : "";
    for (const c of chunkText(prefix + section.content, null, seq)) {
      chunks.push({ ...c, sectionTitle: section.title });
      seq = c.seq + 1;
    }
  }
  return chunks;
}

import { getDb } from "./db";

export type RetrievedChunk = {
  chunkId: number;
  documentId: number;
  documentName: string;
  pageNumber: number | null;
  score: number;
  content: string;
};

function sanitizeQuery(query: string): string {
  const tokens = query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3)
    .slice(0, 12);
  if (tokens.length === 0) return "";
  return tokens.map((t) => `${t}*`).join(" OR ");
}

export function searchChunks(params: {
  userId: number;
  courseId: number;
  query: string;
  limit?: number;
}): RetrievedChunk[] {
  const db = getDb();
  const ftsQuery = sanitizeQuery(params.query);
  const limit = Math.min(params.limit ?? 6, 12);
  if (!ftsQuery) return [];
  try {
    const rows = db
      .prepare(
        `SELECT dc.id AS chunkId, dc.document_id AS documentId, d.original_name AS documentName,
                dc.page_number AS pageNumber, dc.content AS content, bm25(document_chunks_fts) AS score
         FROM document_chunks_fts
         JOIN document_chunks dc ON dc.id = document_chunks_fts.rowid
         JOIN documents d ON d.id = dc.document_id
         WHERE document_chunks_fts MATCH ?
           AND d.course_id = ? AND d.user_id = ? AND d.status = 'done'
         ORDER BY score ASC
         LIMIT ?`,
      )
      .all(ftsQuery, params.courseId, params.userId, limit) as RetrievedChunk[];
    return rows;
  } catch {
    return [];
  }
}

export function formatSources(chunks: RetrievedChunk[]): string {
  return chunks
    .map((c) => {
      const page = c.pageNumber ? `, page ${c.pageNumber}` : "";
      return `- ${c.documentName}${page}`;
    })
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .join("\n");
}

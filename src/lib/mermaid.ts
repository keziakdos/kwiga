const START = /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram-v2|stateDiagram|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline|quadrantChart|block-beta|sankey-beta|xychart-beta)\b/;

/** Nettoie le code Mermaid produit par un modèle ou un utilisateur. */
export function cleanMermaid(input: string): string {
  if (!input) return "";
  let s = input.trim();
  s = s.replace(/^```(?:mermaid)?\s*/i, "").replace(/```\s*$/i, "").trim();
  s = s.replace(/^mermaid\s+/i, "");
  s = s.replace(/\r\n/g, "\n");
  s = s.replace(/[\u2192\u2794\u27a1]/g, "-->");
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  const first = s.split("\n").find((line) => line.trim().length > 0)?.trim() ?? "";
  if (!START.test(first)) return "";
  return s;
}

export function isLikelyMermaid(input: string): boolean {
  return cleanMermaid(input).length > 0;
}

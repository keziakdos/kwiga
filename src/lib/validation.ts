export function assertStrongPassword(pw: string): string | null {
  if (pw.length < 12) return "Le mot de passe doit contenir au moins 12 caractères.";
  if (!/[a-z]/.test(pw)) return "Ajoutez au moins une minuscule.";
  if (!/[A-Z]/.test(pw)) return "Ajoutez au moins une majuscule.";
  if (!/[0-9]/.test(pw)) return "Ajoutez au moins un chiffre.";
  return null;
}

export function clampText(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

export const DOMAINS = [
  { value: "reseau", label: "Réseaux informatiques" },
  { value: "cybersecurite", label: "Cybersécurité" },
  { value: "webmaster", label: "Webmaster / développement web" },
] as const;

export const LEVELS = [
  { value: "debutant", label: "Débutant" },
  { value: "intermediaire", label: "Intermédiaire" },
  { value: "avance", label: "Avancé" },
] as const;

export function domainLabel(value: string): string {
  return DOMAINS.find((d) => d.value === value)?.label ?? value;
}

export function levelLabel(value: string): string {
  return LEVELS.find((l) => l.value === value)?.label ?? value;
}

export function statusLabel(value: string): string {
  const map: Record<string, string> = {
    non_commence: "Non commencé",
    etudie: "Étudié",
    a_revoir: "À revoir",
    maitrise: "Maîtrisé",
  };
  return map[value] ?? value;
}

"use client";

import { useMemo, useState } from "react";
import { getAnimationOutline } from "@/lib/animations";
import { generateImageDirectAction } from "@/app/actions/visual";
import { ZoomableImage } from "@/components/ZoomableImage";

function buildDefaultPrompt(title: string, caption: string, steps: Array<{ title: string; detail: string }>): string {
  const stepLines = steps.map((s, i) => `${i + 1}. ${s.title} — ${s.detail}`).join("\n");
  return `Crée un schéma technique pédagogique (image unique, style infographie claire) pour expliquer « ${title} » à un débutant en réseaux.
Type de schéma : ${caption}.
Déroulé à représenter : ${stepLines}
Contraintes : ordinateurs, switch, routeur ou serveur quand c'est pertinent, flèches numérotées montrant le sens des messages, légendes courtes en français, fond clair, couleurs sobres, sans logo de marque, sans texte inventé.`;
}

export function SchemaPrompt({
  title,
  context,
  courseId,
  notionId,
  configured,
}: {
  title: string;
  context: string;
  courseId: number;
  notionId: number;
  configured: boolean;
}) {
  const outline = useMemo(() => getAnimationOutline(title, context), [title, context]);
  const defaultPrompt = useMemo(
    () => buildDefaultPrompt(title, outline.caption, outline.steps),
    [title, outline],
  );
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<{ id: number; url: string } | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copie impossible dans ce navigateur. Sélectionnez le texte manuellement.");
    }
  }

  async function generate() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await generateImageDirectAction({ courseId, notionId, prompt });
    setBusy(false);
    if (!res.ok || !res.image) {
      setError(res.error ?? "Génération impossible.");
      return;
    }
    setImage(res.image);
  }

  return (
    <div className="mt-3 rounded-2xl border border-ink/10 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-board-deep">
          Proposition de prompt pour le schéma animé
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setPrompt(defaultPrompt)} className="rounded-lg border border-ink/15 px-2.5 py-1 text-xs text-ink-soft hover:bg-ink/5">
            Régénérer la proposition
          </button>
          <button type="button" onClick={copy} className="rounded-lg border border-ink/15 px-2.5 py-1 text-xs text-ink-soft hover:bg-ink/5">
            {copied ? "Copié ✓" : "Copier"}
          </button>
        </div>
      </div>

      <p className="mt-1 text-[11px] text-ink-faint">
        Scénario détecté : <strong className="text-ink-soft">{outline.caption}</strong> · {outline.steps.length} étapes.
        Modifiez le texte si besoin, puis générez une image du schéma.
      </p>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={7}
        maxLength={2000}
        className="field mt-2 resize-y font-mono text-[12px] leading-relaxed"
        aria-label="Proposition de prompt pour le schéma animé"
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={generate}
          disabled={busy || !configured}
          className="btn-primary px-3 py-1.5 text-xs"
        >
          {busy ? "Génération…" : "Générer une image du schéma"}
        </button>
        <span className="text-[11px] text-ink-faint">
          Le prompt peut aussi être copié pour un autre outil. La génération utilise Google et le budget IA.
        </span>
      </div>
      {!configured ? (
        <p className="mt-2 rounded-lg bg-accent-yellow/15 px-3 py-2 text-xs text-[#7a5b00]">
          Génération d&apos;images non configurée : le prompt reste disponible (copie), mais l&apos;image ne
          peut pas être créée par Kwiga.
        </p>
      ) : null}
      {error ? <p role="alert" className="mt-2 text-xs text-[#a33c22]">{error}</p> : null}
      {image ? (
        <div className="mt-3 max-w-md">
          <ZoomableImage
            src={image.url}
            alt={`Schéma généré — ${title}`}
            caption="Schéma généré à partir du prompt (enregistré dans les illustrations)."
            className="max-h-72"
          />
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { markCardUnderstoodAction, generateImageDirectAction } from "@/app/actions/visual";

export type VisualCard = {
  notionId: number;
  title: string;
  summary: string;
  explanation: string;
  understood: boolean;
  images: Array<{ id: number; url: string; prompt: string | null }>;
};

const OPTIONS: Array<{ key: string; label: string }> = [
  { key: "computers", label: "Montrer des ordinateurs qui communiquent" },
  { key: "packet", label: "Chemin d'un paquet (PC → switch → routeur → serveur)" },
  { key: "layers", label: "Schéma des couches OSI / TCP-IP" },
  { key: "addressing", label: "Adresses IP et masque" },
  { key: "labels", label: "Légendes en français" },
  { key: "simple", label: "Version simplifiée pour débutant" },
];

export function VisualCards({
  courseId,
  cards,
  initialIndex,
  configured,
}: {
  courseId: number;
  cards: VisualCard[];
  initialIndex: number;
  configured: boolean;
}) {
  const [index, setIndex] = useState(Math.min(Math.max(initialIndex, 0), Math.max(cards.length - 1, 0)));
  const [understood, setUnderstood] = useState<Set<number>>(
    () => new Set(cards.filter((c) => c.understood).map((c) => c.notionId)),
  );
  const [images, setImages] = useState<Record<number, VisualCard["images"]>>(() => {
    const map: Record<number, VisualCard["images"]> = {};
    for (const c of cards) map[c.notionId] = c.images;
    return map;
  });
  const [showPrompt, setShowPrompt] = useState(false);
  const [checks, setChecks] = useState<Record<string, boolean>>({
    computers: true,
    labels: true,
  });
  const [freeText, setFreeText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);

  const card = cards[index];
  const cardImages = card ? images[card.notionId] ?? [] : [];
  const done = understood.size;

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(null);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [zoom]);

  useEffect(() => {
    setShowPrompt(false);
    setFreeText("");
    setError(null);
  }, [index]);

  if (!card) {
    return <p className="text-sm text-ink-soft">Aucune carte pour ce parcours.</p>;
  }

  function goNext() {
    setIndex((i) => Math.min(i + 1, cards.length - 1));
  }
  function goPrev() {
    setIndex((i) => Math.max(i - 1, 0));
  }

  async function mark(ok: boolean) {
    setError(null);
    const res = await markCardUnderstoodAction({ courseId, notionId: card.notionId, understood: ok });
    if (!res.ok) {
      setError(res.error ?? "Impossible d'enregistrer.");
      return;
    }
    setUnderstood((prev) => {
      const next = new Set(prev);
      if (ok) next.add(card.notionId);
      else next.delete(card.notionId);
      return next;
    });
    if (ok) goNext();
  }

  async function generate() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const selected = OPTIONS.filter((o) => checks[o.key]).map((o) => o.label);
    const prompt = [freeText.trim(), selected.join(". "), `Notion : ${card.title}`]
      .filter(Boolean)
      .join(". ");
    const res = await generateImageDirectAction({ courseId, notionId: card.notionId, prompt });
    setBusy(false);
    if (!res.ok || !res.image) {
      setError(res.error ?? "Génération impossible.");
      return;
    }
    const img = { id: res.image.id, url: res.image.url, prompt };
    setImages((prev) => ({ ...prev, [card.notionId]: [img, ...(prev[card.notionId] ?? [])] }));
    setZoom(res.image.url);
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Carte {index + 1} / {cards.length}
          </p>
          <p className="text-xs text-ink-soft">
            {done} comprise(s) · {cards.length - done} restante(s)
          </p>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink/10">
          <div
            className="h-full rounded-full bg-board-soft transition-all duration-500"
            style={{ width: `${cards.length ? (done / cards.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      <article className="board-surface rounded-3xl p-6 shadow-card sm:p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-white/50">Texte du chapitre</p>
        <h2 className="mt-1 font-display text-2xl text-white">{card.title}</h2>
        {card.summary ? <p className="mt-3 text-sm leading-relaxed text-white/85">{card.summary}</p> : null}
        {card.explanation ? (
          <div className="mt-3 max-h-[22rem] overflow-y-auto pr-1">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/75">{card.explanation}</p>
          </div>
        ) : null}

        {cardImages.length > 0 ? (
          <div className="mt-5 border-t border-white/15 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              Illustrations de cette carte
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {cardImages.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setZoom(img.url)}
                  className="overflow-hidden rounded-lg border border-white/20"
                  aria-label="Agrandir l'illustration"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.prompt ?? "Illustration"} className="h-24 w-32 object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={() => mark(true)} className="btn-accent px-3.5 py-2 text-xs">
            J&apos;ai compris → carte suivante
          </button>
          <button
            type="button"
            onClick={() => setShowPrompt((v) => !v)}
            className="btn border border-white/25 bg-white/10 px-3.5 py-2 text-xs text-white hover:bg-white/20"
          >
            {showPrompt ? "Masquer le générateur d'image" : "Pas compris → créer une image"}
          </button>
          <button
            type="button"
            onClick={() => mark(false)}
            className="btn border border-white/15 bg-transparent px-3 py-2 text-xs text-white/70 hover:bg-white/10"
          >
            À revoir
          </button>
        </div>
      </article>

      {showPrompt ? (
        <section className="card p-5">
          <h3 className="font-display text-lg text-ink">Composer l&apos;illustration</h3>
          <p className="mt-0.5 text-xs text-ink-soft">
            Cochez ce que vous voulez voir. Une image est générée et enregistrée pour cette carte.
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {OPTIONS.map((option) => (
              <label
                key={option.key}
                className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition ${
                  checks[option.key]
                    ? "border-board/40 bg-board/5 text-ink"
                    : "border-ink/10 bg-white text-ink-soft hover:border-ink/25"
                }`}
              >
                <input
                  type="checkbox"
                  checked={Boolean(checks[option.key])}
                  onChange={(e) => setChecks((prev) => ({ ...prev, [option.key]: e.target.checked }))}
                  className="accent-[#14532d]"
                />
                {option.label}
              </label>
            ))}
          </div>

          <div className="mt-3">
            <label className="label" htmlFor={`visual-prompt-${card.notionId}`}>
              Précisions (facultatif)
            </label>
            <textarea
              id={`visual-prompt-${card.notionId}`}
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              rows={2}
              maxLength={600}
              className="field resize-y"
              placeholder="Ex. je ne comprends pas pourquoi le paquet change d'adresse MAC à chaque routeur"
            />
          </div>

          {!configured ? (
            <p className="mt-3 rounded-xl bg-accent-yellow/15 px-3.5 py-2.5 text-xs leading-relaxed text-[#7a5b00]">
              La génération d&apos;images n&apos;est pas configurée (facturation Google + variables
              IMAGE_*). Vous pouvez tout de même passer à la carte suivante.
            </p>
          ) : null}

          {error ? <p role="alert" className="mt-2 text-sm text-[#a33c22]">{error}</p> : null}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={generate}
              disabled={busy || !configured}
              className="btn-primary px-3.5 py-2 text-xs"
            >
              {busy ? "Génération…" : "Générer l'image"}
            </button>
            <button type="button" onClick={() => mark(true)} className="btn-ghost px-3 py-2 text-xs">
              Finalement, j&apos;ai compris → suivant
            </button>
          </div>
        </section>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={goPrev}
          disabled={index === 0}
          className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-40"
        >
          ← Carte précédente
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={index >= cards.length - 1}
          className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-40"
        >
          Carte suivante →
        </button>
      </div>

      {zoom ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-deep/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Illustration agrandie"
          onClick={() => setZoom(null)}
        >
          <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setZoom(null)}
              className="absolute -top-3 right-0 z-10 grid h-9 w-9 place-items-center rounded-full bg-white text-lg text-ink shadow-lg"
              aria-label="Fermer"
            >
              ✕
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoom}
              alt="Illustration pédagogique agrandie"
              className="mx-auto max-h-[85vh] w-auto max-w-full rounded-xl bg-white object-contain shadow-2xl"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

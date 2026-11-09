"use client";

import { useActionState, useEffect, useState } from "react";
import { generateImageAction, deleteImageAction, type ImageState } from "@/app/actions/images";

export type ImageItem = { id: number; url: string; prompt: string | null; model: string | null; created_at: string };

export function ImageGallery({
  courseId,
  notionId,
  images,
  configured,
  maxPerNotion,
}: {
  courseId: number;
  notionId: number;
  images: ImageItem[];
  configured: boolean;
  maxPerNotion: number;
}) {
  const [state, formAction] = useActionState<ImageState, FormData>(generateImageAction, { ok: false });
  const [prompt, setPrompt] = useState("");
  const [zoom, setZoom] = useState<number | null>(null);
  const full = images.length >= maxPerNotion;

  useEffect(() => {
    if (zoom === null) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setZoom(null);
      if (event.key === "ArrowRight") setZoom((z) => (z === null ? null : (z + 1) % images.length));
      if (event.key === "ArrowLeft") setZoom((z) => (z === null ? null : (z - 1 + images.length) % images.length));
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [zoom, images.length]);

  const current = zoom !== null ? images[zoom] : null;

  return (
    <section className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-board-deep">Illustrations</h2>
        <span className="text-xs text-ink-faint">{images.length} / {maxPerNotion}</span>
      </div>

      {!configured ? (
        <p className="mt-2 rounded-xl bg-accent-yellow/15 px-3.5 py-2.5 text-xs leading-relaxed text-[#7a5b00]">
          La génération d&apos;images n&apos;est pas configurée. L&apos;administrateur doit activer la
          facturation Google, puis renseigner <code>IMAGE_PROVIDER=google</code>,{" "}
          <code>IMAGE_MODEL</code> et <code>IMAGE_API_KEY</code>. Chaque image est facturée
          (environ 0,03–0,04 $ l&apos;image 1K) et décomptée du budget IA.
        </p>
      ) : (
        <form action={formAction} className="mt-2 space-y-2">
          <input type="hidden" name="course_id" value={courseId} />
          <input type="hidden" name="notion_id" value={notionId} />
          <label className="label" htmlFor={`img-prompt-${notionId}`}>
            Illustration à générer (facultatif)
          </label>
          <input
            id={`img-prompt-${notionId}`}
            name="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={800}
            className="field"
            placeholder="Ex. montrer la circulation d'un paquet du PC au serveur à travers un routeur"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="btn-primary px-3.5 py-2 text-xs" disabled={full}>
              {full ? "Limite atteinte" : "Générer une illustration"}
            </button>
            <span className="text-[11px] text-ink-faint">
              Facturé au fournisseur (Google) et compté dans le budget IA.
            </span>
          </div>
          {state.error ? <p role="alert" className="text-xs text-[#a33c22]">{state.error}</p> : null}
          {state.message ? <p className="text-xs text-board-deep">{state.message}</p> : null}
        </form>
      )}

      {images.length > 0 ? (
        <>
          <p className="mt-2 text-xs text-ink-faint">Cliquez sur une image pour l&apos;agrandir.</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {images.map((img, index) => (
              <figure key={img.id} className="overflow-hidden rounded-xl border border-paper-line bg-white">
                <button
                  type="button"
                  onClick={() => setZoom(index)}
                  className="group block w-full cursor-zoom-in"
                  aria-label={`Agrandir l'illustration ${index + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.prompt ?? "Illustration pédagogique"}
                    className="h-56 w-full object-cover transition duration-200 group-hover:brightness-105"
                    loading="lazy"
                  />
                </button>
                <figcaption className="flex items-start justify-between gap-2 px-3 py-2">
                  <span className="line-clamp-2 text-xs text-ink-soft">{img.prompt ?? "Illustration générée"}</span>
                  <form action={deleteImageAction}>
                    <input type="hidden" name="course_id" value={courseId} />
                    <input type="hidden" name="notion_id" value={notionId} />
                    <input type="hidden" name="image_id" value={img.id} />
                    <button type="submit" className="shrink-0 text-xs text-ink-faint hover:text-[#a33c22]">
                      Supprimer
                    </button>
                  </form>
                </figcaption>
              </figure>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-2 text-xs text-ink-faint">
          Aucune illustration pour l&apos;instant. Chaque clic ajoute une image à la galerie ; elle est
          enregistrée et réutilisable.
        </p>
      )}

      {current ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-deep/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Illustration agrandie"
          onClick={() => setZoom(null)}
        >
          <div className="relative w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setZoom(null)}
              className="absolute -top-3 right-0 z-10 grid h-9 w-9 place-items-center rounded-full bg-white text-lg text-ink shadow-lg hover:bg-paper"
              aria-label="Fermer l'image"
            >
              ✕
            </button>
            {images.length > 1 ? (
              <button
                type="button"
                onClick={() => setZoom((z) => (z === null ? null : (z - 1 + images.length) % images.length))}
                className="absolute left-1 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-lg text-ink shadow-lg hover:bg-white"
                aria-label="Image précédente"
              >
                ‹
              </button>
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.url}
              alt={current.prompt ?? "Illustration pédagogique agrandie"}
              className="mx-auto max-h-[82vh] w-auto max-w-full rounded-xl bg-white object-contain shadow-2xl"
            />
            {images.length > 1 ? (
              <button
                type="button"
                onClick={() => setZoom((z) => (z === null ? null : (z + 1) % images.length))}
                className="absolute right-1 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-lg text-ink shadow-lg hover:bg-white"
                aria-label="Image suivante"
              >
                ›
              </button>
            ) : null}
            <div className="mt-3 flex items-start justify-between gap-3 text-xs text-white/80">
              <span className="line-clamp-2">{current.prompt ?? "Illustration générée"}</span>
              <span className="shrink-0 tabular-nums">
                {zoom! + 1} / {images.length}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

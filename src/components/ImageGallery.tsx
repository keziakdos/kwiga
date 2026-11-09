"use client";

import { useActionState, useState } from "react";
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
  const full = images.length >= maxPerNotion;

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
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {images.map((img) => (
            <figure key={img.id} className="overflow-hidden rounded-xl border border-paper-line bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.prompt ?? "Illustration pédagogique"} className="h-56 w-full object-cover" loading="lazy" />
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
      ) : (
        <p className="mt-2 text-xs text-ink-faint">
          Aucune illustration pour l&apos;instant. Chaque clic ajoute une image à la galerie ; elle est
          enregistrée et réutilisable.
        </p>
      )}
    </section>
  );
}

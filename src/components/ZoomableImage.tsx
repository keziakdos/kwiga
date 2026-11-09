"use client";

import { useEffect, useState } from "react";

export function ZoomableImage({
  src,
  alt,
  caption,
  className = "",
  zoomLabel = "Cliquez pour agrandir",
}: {
  src: string;
  alt: string;
  caption?: string;
  className?: string;
  zoomLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <figure className="overflow-hidden rounded-xl border border-ink/10 bg-white">
        <button type="button" onClick={() => setOpen(true)} className="group block w-full cursor-zoom-in" aria-label={zoomLabel}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className={`w-full object-contain transition duration-200 group-hover:brightness-105 ${className}`}
            loading="lazy"
          />
        </button>
        {caption ? (
          <figcaption className="border-t border-ink/10 px-3 py-2 text-[11px] text-ink-soft">{caption}</figcaption>
        ) : null}
      </figure>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-deep/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setOpen(false)}
        >
          <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute -top-3 right-0 z-10 grid h-9 w-9 place-items-center rounded-full bg-white text-lg text-ink shadow-lg"
              aria-label="Fermer"
            >
              ✕
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} className="mx-auto max-h-[85vh] w-auto max-w-full rounded-xl bg-white object-contain shadow-2xl" />
            {caption ? <p className="mt-2 text-center text-xs text-white/70">{caption}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

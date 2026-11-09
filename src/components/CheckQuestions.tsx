"use client";

import { useState } from "react";

export type CheckItem = { question: string; answer: string };

export function CheckQuestions({ items }: { items: CheckItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (items.length === 0) return null;

  return (
    <ul className="mt-2 space-y-2">
      {items.map((item, index) => {
        const isOpen = open === index;
        return (
          <li key={index} className="overflow-hidden rounded-xl border border-paper-line bg-white/70">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : index)}
              className="flex w-full items-start justify-between gap-3 px-3.5 py-2.5 text-left text-sm text-ink transition hover:bg-board/5"
              aria-expanded={isOpen}
            >
              <span className="flex gap-2">
                <span className="font-semibold text-board-deep">{index + 1}.</span>
                <span>{item.question}</span>
              </span>
              <span className={`shrink-0 text-xs font-medium ${isOpen ? "text-board-deep" : "text-ink-faint"}`}>
                {isOpen ? "Masquer" : "Voir la réponse"}
              </span>
            </button>
            {isOpen ? (
              <div className="border-t border-paper-line bg-board/5 px-3.5 py-2.5 text-sm leading-relaxed text-ink-soft">
                {item.answer ? (
                  item.answer
                ) : (
                  <span className="text-ink-faint">
                    Aucune réponse enregistrée pour cette fiche. Formulez votre réponse, puis demandez au tuteur
                    de la vérifier (« Vérifie mon raisonnement »).
                  </span>
                )}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

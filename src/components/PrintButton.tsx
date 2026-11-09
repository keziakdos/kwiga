"use client";

export function PrintButton() {
  return (
    <button type="button" className="btn-ghost px-3 py-1.5 text-xs print:hidden" onClick={() => window.print()}>
      Imprimer la fiche
    </button>
  );
}

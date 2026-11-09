"use client";

import { useActionState } from "react";
import { uploadPdfAction, addNotesAction, type DocumentState } from "@/app/actions/documents";
import { SubmitButton } from "./SubmitButton";

export function PdfUploadForm({ courseId }: { courseId: number }) {
  const [state, formAction] = useActionState<DocumentState, FormData>(uploadPdfAction, {});
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="course_id" value={courseId} />
      <label className="label" htmlFor="file">
        Fichier PDF
      </label>
      <input
        id="file"
        name="file"
        type="file"
        accept="application/pdf,.pdf"
        required
        className="block w-full cursor-pointer rounded-xl border border-dashed border-ink/25 bg-white px-3.5 py-3 text-sm text-ink-soft file:mr-3 file:rounded-lg file:border-0 file:bg-board file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:border-board/40"
      />
      {state.error ? <p role="alert" className="text-sm text-[#a33c22]">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-board-deep">{state.success}</p> : null}
      <SubmitButton className="btn-ghost" pendingLabel="Envoi…">
        Importer le PDF
      </SubmitButton>
    </form>
  );
}

export function NotesForm({ courseId }: { courseId: number }) {
  const [state, formAction] = useActionState<DocumentState, FormData>(addNotesAction, {});
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="course_id" value={courseId} />
      <div>
        <label className="label" htmlFor="notes_title">
          Titre des notes
        </label>
        <input id="notes_title" name="title" className="field" maxLength={160} placeholder="Ex. Notes du cours — adressage IP" />
      </div>
      <div>
        <label className="label" htmlFor="notes_text">
          Texte
        </label>
        <textarea
          id="notes_text"
          name="text"
          className="field min-h-[160px] resize-y font-mono text-[13px]"
          required
          placeholder={"# Chapitre 1 — Le modèle OSI\n\nLe modèle OSI comporte 7 couches…\n\n# Chapitre 2 — IPv4\n\n…"}
        />
        <p className="mt-1 text-xs text-ink-faint">
          Utilisez des titres (# ou « Chapitre 1 — ») pour structurer. Les notes sont référencées par section, sans pagination inventée.
        </p>
      </div>
      {state.error ? <p role="alert" className="text-sm text-[#a33c22]">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-board-deep">{state.success}</p> : null}
      <SubmitButton className="btn-ghost" pendingLabel="Enregistrement…">
        Ajouter les notes
      </SubmitButton>
    </form>
  );
}

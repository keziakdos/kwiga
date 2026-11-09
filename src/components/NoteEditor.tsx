"use client";

import { useActionState } from "react";
import { saveNotionNoteAction, type NoteState } from "@/app/actions/notes";
import { SubmitButton } from "./SubmitButton";

export function NoteEditor({
  notionId,
  courseId,
  initialContent,
}: {
  notionId: number;
  courseId: number;
  initialContent: string;
}) {
  const [state, formAction] = useActionState<NoteState, FormData>(saveNotionNoteAction, { ok: false });
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="notion_id" value={notionId} />
      <input type="hidden" name="course_id" value={courseId} />
      <label className="label" htmlFor={`note-${notionId}`}>
        Notes personnelles
      </label>
      <textarea
        id={`note-${notionId}`}
        name="content"
        className="field min-h-[130px] resize-y font-mono text-[13px]"
        defaultValue={initialContent}
        placeholder="Vos remarques, comparaisons, moyens mnémotechniques…"
      />
      <div className="flex items-center gap-3">
        <SubmitButton className="btn-ghost px-3 py-1.5 text-xs" pendingLabel="Enregistrement…">
          Enregistrer la note
        </SubmitButton>
        {state.message ? <span className="text-xs text-board-deep">{state.message}</span> : null}
        {state.error ? <span className="text-xs text-[#a33c22]">{state.error}</span> : null}
      </div>
    </form>
  );
}

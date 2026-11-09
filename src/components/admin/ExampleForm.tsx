"use client";

import { useActionState } from "react";
import { addExampleDocumentAction, type AdminState } from "@/app/actions/admin";
import { SubmitButton } from "../SubmitButton";

export function ExampleDocumentForm() {
  const [state, formAction] = useActionState<AdminState, FormData>(addExampleDocumentAction, { ok: false });
  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="ex-title">Titre</label>
          <input id="ex-title" name="title" className="field" required maxLength={160} />
        </div>
        <div>
          <label className="label" htmlFor="ex-domain">Domaine</label>
          <select id="ex-domain" name="domain" className="field" defaultValue="reseau">
            <option value="reseau">Réseaux</option>
            <option value="cybersecurite">Cybersécurité</option>
            <option value="webmaster">Webmaster</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="ex-desc">Description</label>
        <textarea id="ex-desc" name="description" className="field min-h-[70px] resize-y" maxLength={1000} />
      </div>
      <div>
        <label className="label" htmlFor="ex-url">Lien (facultatif)</label>
        <input id="ex-url" name="url" className="field" placeholder="https://…" />
      </div>
      {state.error ? <p role="alert" className="text-sm text-[#a33c22]">{state.error}</p> : null}
      {state.message ? <p className="text-sm text-board-deep">{state.message}</p> : null}
      <SubmitButton className="btn-primary" pendingLabel="Ajout…">Ajouter</SubmitButton>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import {
  createUserAction,
  resetPasswordAction,
  type AdminState,
} from "@/app/actions/admin";
import { SubmitButton } from "../SubmitButton";

export function CreateUserForm() {
  const [state, formAction] = useActionState<AdminState, FormData>(createUserAction, { ok: false });
  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="username">Identifiant</label>
          <input id="username" name="username" className="field" required pattern="[a-zA-Z0-9._\-]{3,40}" placeholder="prenom.nom" />
        </div>
        <div>
          <label className="label" htmlFor="display_name">Nom affiché</label>
          <input id="display_name" name="display_name" className="field" maxLength={80} placeholder="Prénom Nom" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="role">Rôle</label>
        <select id="role" name="role" className="field" defaultValue="learner">
          <option value="learner">Apprenant</option>
          <option value="admin">Administrateur</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="password">Mot de passe (facultatif)</label>
        <input id="password" name="password" type="password" className="field" autoComplete="new-password" placeholder="Laisser vide pour générer un mot de passe temporaire" />
      </div>
      {state.error ? <p role="alert" className="text-sm text-[#a33c22]">{state.error}</p> : null}
      {state.message ? <p className="text-sm text-board-deep">{state.message}</p> : null}
      {state.tempPassword ? (
        <div className="rounded-xl border border-accent-yellow/60 bg-accent-yellow/15 px-3.5 py-2.5 text-sm text-[#7a5b00]">
          Mot de passe temporaire de <strong>{state.username}</strong> :{" "}
          <code className="select-all rounded bg-white px-1.5 py-0.5 font-mono">{state.tempPassword}</code>
          <p className="mt-1 text-xs">Il ne sera plus affiché. Transmettez-le par un canal sûr.</p>
        </div>
      ) : null}
      <SubmitButton className="btn-primary" pendingLabel="Création…">Créer le compte</SubmitButton>
    </form>
  );
}

export function ResetPasswordButton({ userId, username }: { userId: number; username: string }) {
  const [state, formAction] = useActionState<AdminState, FormData>(resetPasswordAction, { ok: false });
  return (
    <form action={formAction} className="inline-flex flex-wrap items-center gap-2">
      <input type="hidden" name="user_id" value={userId} />
      <button type="submit" className="btn-ghost px-2.5 py-1 text-xs">
        Réinitialiser
      </button>
      {state.tempPassword ? (
        <span className="text-xs text-[#7a5b00]">
          Temporaire pour {username} :{" "}
          <code className="select-all rounded bg-accent-yellow/20 px-1 py-0.5 font-mono">{state.tempPassword}</code>
        </span>
      ) : null}
      {state.error ? <span className="text-xs text-[#a33c22]">{state.error}</span> : null}
    </form>
  );
}

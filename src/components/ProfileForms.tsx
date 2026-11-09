"use client";

import { useActionState } from "react";
import { changePasswordAction, updateProfileAction, type ChangePasswordState } from "@/app/actions/auth";
import { SubmitButton } from "./SubmitButton";

export function ChangePasswordForm({ forced = false }: { forced?: boolean }) {
  const [state, formAction] = useActionState<ChangePasswordState, FormData>(changePasswordAction, {});
  return (
    <form action={formAction} className="space-y-4">
      {!forced ? (
        <div>
          <label className="label" htmlFor="current">
            Mot de passe actuel
          </label>
          <input id="current" name="current" type="password" className="field" autoComplete="current-password" required />
        </div>
      ) : (
        <input type="hidden" name="current" value="" />
      )}
      <div>
        <label className="label" htmlFor="next">
          Nouveau mot de passe
        </label>
        <input id="next" name="next" type="password" className="field" autoComplete="new-password" required minLength={12} />
        <p className="mt-1 text-xs text-ink-faint">12 caractères minimum, avec majuscule, minuscule et chiffre.</p>
      </div>
      <div>
        <label className="label" htmlFor="confirm">
          Confirmer
        </label>
        <input id="confirm" name="confirm" type="password" className="field" autoComplete="new-password" required minLength={12} />
      </div>
      {state.error ? <p role="alert" className="rounded-xl bg-accent-coral/10 px-3.5 py-2.5 text-sm text-[#a33c22]">{state.error}</p> : null}
      {state.success ? <p className="rounded-xl bg-board/10 px-3.5 py-2.5 text-sm text-board-deep">{state.success}</p> : null}
      <SubmitButton className="btn-primary" pendingLabel="Mise à jour…">
        Changer le mot de passe
      </SubmitButton>
    </form>
  );
}

export function ProfileForm({ displayName, email }: { displayName: string; email: string | null }) {
  const [state, formAction] = useActionState<ChangePasswordState, FormData>(updateProfileAction, {});
  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="display_name">
          Nom affiché
        </label>
        <input id="display_name" name="display_name" className="field" defaultValue={displayName} required maxLength={80} />
      </div>
      <div>
        <label className="label" htmlFor="email">
          Adresse e-mail (facultatif)
        </label>
        <input id="email" name="email" type="email" className="field" defaultValue={email ?? ""} placeholder="Sert uniquement au contact administratif" />
      </div>
      {state.error ? <p role="alert" className="text-sm text-[#a33c22]">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-board-deep">{state.success}</p> : null}
      <SubmitButton className="btn-ghost" pendingLabel="Enregistrement…">
        Enregistrer le profil
      </SubmitButton>
    </form>
  );
}

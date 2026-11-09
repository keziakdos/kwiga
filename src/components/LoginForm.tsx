"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/actions/auth";
import { SubmitButton } from "./SubmitButton";

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={formAction} className="space-y-4" autoComplete="on">
      <div>
        <label className="label" htmlFor="username">
          Identifiant
        </label>
        <input
          id="username"
          name="username"
          className="field"
          autoComplete="username"
          required
          autoFocus
          placeholder="votre identifiant"
        />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="field"
          autoComplete="current-password"
          required
          placeholder="••••••••••••"
        />
      </div>

      {state.error ? (
        <p role="alert" className="rounded-xl bg-accent-coral/10 px-3.5 py-2.5 text-sm text-[#a33c22]">
          {state.error}
        </p>
      ) : null}

      <SubmitButton className="btn-primary w-full" pendingLabel="Connexion…">
        Se connecter
      </SubmitButton>

      <p className="text-center text-xs text-ink-faint">
        Accès réservé aux comptes créés par l&apos;administrateur.
      </p>
    </form>
  );
}

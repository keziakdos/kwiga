"use client";

import { useActionState } from "react";
import {
  updateSettingsAction,
  updateBudgetAction,
  addExpenseAction,
  type AdminState,
} from "@/app/actions/admin";
import { SubmitButton } from "../SubmitButton";

export function ConfigForm({
  maxActiveCourses,
  maxPdfMb,
  maxPdfPages,
  maxUploads,
}: {
  maxActiveCourses: number;
  maxPdfMb: number;
  maxPdfPages: number;
  maxUploads: number;
}) {
  const [state, formAction] = useActionState<AdminState, FormData>(updateSettingsAction, { ok: false });
  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="max_active_courses">Parcours actifs maximum / personne</label>
          <input id="max_active_courses" name="max_active_courses" type="number" min={1} max={20} className="field" defaultValue={maxActiveCourses} />
        </div>
        <div>
          <label className="label" htmlFor="max_uploads">Documents maximum / personne</label>
          <input id="max_uploads" name="max_uploads" type="number" min={1} max={500} className="field" defaultValue={maxUploads} />
        </div>
        <div>
          <label className="label" htmlFor="max_pdf_mb">Taille PDF maximum (Mo)</label>
          <input id="max_pdf_mb" name="max_pdf_mb" type="number" min={1} max={200} className="field" defaultValue={maxPdfMb} />
        </div>
        <div>
          <label className="label" htmlFor="max_pdf_pages">Pages PDF maximum</label>
          <input id="max_pdf_pages" name="max_pdf_pages" type="number" min={1} max={2000} className="field" defaultValue={maxPdfPages} />
        </div>
      </div>
      {state.error ? <p role="alert" className="text-sm text-[#a33c22]">{state.error}</p> : null}
      {state.message ? <p className="text-sm text-board-deep">{state.message}</p> : null}
      <SubmitButton className="btn-primary" pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
    </form>
  );
}

export function BudgetSettingsForm({
  cap,
  margin,
  currency,
  fxRate,
  periodStart,
}: {
  cap: number;
  margin: number;
  currency: string;
  fxRate: number;
  periodStart: string;
}) {
  const [state, formAction] = useActionState<AdminState, FormData>(updateBudgetAction, { ok: false });
  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="monthly_cap_eur">Plafond mensuel</label>
          <input id="monthly_cap_eur" name="monthly_cap_eur" type="number" step="0.01" min={0.01} className="field" defaultValue={cap} />
        </div>
        <div>
          <label className="label" htmlFor="margin_pct">Marge de sécurité (%)</label>
          <input id="margin_pct" name="margin_pct" type="number" step="1" min={0} max={90} className="field" defaultValue={margin} />
        </div>
        <div>
          <label className="label" htmlFor="currency">Devise</label>
          <input id="currency" name="currency" className="field" defaultValue={currency} maxLength={8} />
        </div>
        <div>
          <label className="label" htmlFor="fx_rate">Taux de conversion</label>
          <input id="fx_rate" name="fx_rate" type="number" step="0.0001" min={0.0001} className="field" defaultValue={fxRate} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="period_start">Début de période</label>
          <input id="period_start" name="period_start" type="date" className="field" defaultValue={periodStart.slice(0, 10)} />
        </div>
      </div>
      {state.error ? <p role="alert" className="text-sm text-[#a33c22]">{state.error}</p> : null}
      {state.message ? <p className="text-sm text-board-deep">{state.message}</p> : null}
      <SubmitButton className="btn-primary" pendingLabel="Enregistrement…">Mettre à jour</SubmitButton>
    </form>
  );
}

export function ExpenseForm() {
  const [state, formAction] = useActionState<AdminState, FormData>(addExpenseAction, { ok: false });
  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <div>
          <label className="label" htmlFor="label">Libellé</label>
          <input id="label" name="label" className="field" required maxLength={120} placeholder="Ex. frais VPS, abonnement…" />
        </div>
        <div>
          <label className="label" htmlFor="amount_eur">Montant (€)</label>
          <input id="amount_eur" name="amount_eur" type="number" step="0.01" min={0} className="field" required />
        </div>
        <div>
          <label className="label" htmlFor="category">Catégorie</label>
          <select id="category" name="category" className="field" defaultValue="autre">
            <option value="fixe">Fixe</option>
            <option value="autre">Autre</option>
            <option value="dev">Développement</option>
          </select>
        </div>
      </div>
      {state.error ? <p role="alert" className="text-sm text-[#a33c22]">{state.error}</p> : null}
      {state.message ? <p className="text-sm text-board-deep">{state.message}</p> : null}
      <SubmitButton className="btn-ghost" pendingLabel="Ajout…">Ajouter la dépense</SubmitButton>
    </form>
  );
}

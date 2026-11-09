"use client";

import { useActionState, useState } from "react";
import { createCourseAction, type CourseFormState } from "@/app/actions/courses";
import { SubmitButton } from "@/components/SubmitButton";
import { DOMAINS, LEVELS } from "@/lib/validation";

export function NewCourseForm() {
  const [state, formAction] = useActionState<CourseFormState, FormData>(createCourseAction, {});
  const [goal, setGoal] = useState("");

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className="label" htmlFor="title">
          Titre du parcours
        </label>
        <input id="title" name="title" className="field" required maxLength={160} placeholder="Ex. Bases des réseaux — préparation CCNA" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="domain">
            Domaine
          </label>
          <select id="domain" name="domain" className="field" defaultValue="reseau" required>
            {DOMAINS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="level">
            Niveau
          </label>
          <select id="level" name="level" className="field" defaultValue="debutant" required>
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="goal">
          Objectif
        </label>
        <textarea
          id="goal"
          name="goal"
          className="field min-h-[110px] resize-y"
          required
          maxLength={2000}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Ex. Comprendre l'adressage IPv4 et savoir découper un réseau en sous-réseaux pour préparer le CCNA."
        />
        <p className="mt-1 text-xs text-ink-faint">{goal.length} / 2000</p>
      </div>

      <div>
        <label className="label" htmlFor="target_duration">
          Durée cible (facultatif)
        </label>
        <input id="target_duration" name="target_duration" className="field" maxLength={80} placeholder="Ex. 6 semaines, 3 h par semaine" />
      </div>

      {state.error ? (
        <p role="alert" className="rounded-xl bg-accent-coral/10 px-3.5 py-2.5 text-sm text-[#a33c22]">
          {state.error}
        </p>
      ) : null}

      <div className="rounded-xl border border-ink/10 bg-white px-4 py-3 text-xs leading-relaxed text-ink-soft">
        Après la création, vous importerez un PDF ou collerez vos notes, puis Kwiga proposera un plan
        que vous pourrez valider ou régénérer avant de commencer.
      </div>

      <SubmitButton className="btn-primary" pendingLabel="Création…">
        Créer le parcours
      </SubmitButton>
    </form>
  );
}

"use client";

import { useState } from "react";
import { submitExerciseAction, type SubmitResult } from "@/app/actions/exercises";

export type ExerciseView = {
  id: number;
  type: string;
  prompt: string;
  options: string[] | null;
  criteria: unknown;
  points: number;
  best: { score: number; max: number; feedback: string; graded: number } | null;
};

const TYPE_LABEL: Record<string, string> = {
  qcm: "QCM",
  open: "Question ouverte",
  subnet: "Calcul de sous-réseau",
  topology: "Lecture de topologie",
  troubleshooting: "Diagnostic de panne",
  lab: "Travaux pratiques",
};

function ExerciseCard({ exercise, courseId }: { exercise: ExerciseView; courseId: number }) {
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy || !answer.trim()) return;
    setBusy(true);
    setResult(null);
    const res = await submitExerciseAction({ exerciseId: exercise.id, answer, courseId });
    setResult(res);
    setBusy(false);
  }

  return (
    <article className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="chip bg-board/10 text-board-deep">{TYPE_LABEL[exercise.type] ?? exercise.type}</span>
        <span className="text-xs text-ink-faint">{exercise.points} point(s)</span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-relaxed text-ink">{exercise.prompt}</p>

      {exercise.criteria ? (
        <div className="mt-3 rounded-xl border border-ink/10 bg-white px-3.5 py-2.5 text-xs leading-relaxed text-ink-soft">
          <span className="font-semibold text-ink">Critères visibles : </span>
          {Array.isArray(exercise.criteria)
            ? exercise.criteria.join(" · ")
            : typeof exercise.criteria === "object" && exercise.criteria !== null
              ? JSON.stringify(exercise.criteria)
              : String(exercise.criteria)}
        </div>
      ) : null}

      {exercise.options ? (
        <div className="mt-3 space-y-1.5">
          {exercise.options.map((opt) => (
            <label
              key={opt}
              className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm transition ${
                answer === opt ? "border-board/50 bg-board/5 text-ink" : "border-ink/10 bg-white text-ink-soft hover:border-ink/25"
              }`}
            >
              <input
                type="radio"
                name={`ex-${exercise.id}`}
                value={opt}
                checked={answer === opt}
                onChange={() => setAnswer(opt)}
                className="accent-[#14532d]"
              />
              {opt}
            </label>
          ))}
        </div>
      ) : (
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={exercise.type === "subnet" ? 2 : 4}
          className="field mt-3 resize-y"
          placeholder={exercise.type === "subnet" ? "Votre résultat (nombre)…" : "Rédigez votre réponse…"}
        />
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={submit} disabled={busy || !answer.trim()} className="btn-primary px-3.5 py-2 text-xs">
          {busy ? "Correction…" : "Valider ma réponse"}
        </button>
        {result?.ok ? (
          <span className="text-xs text-ink-soft">
            Score : <strong>{Math.round((result.score ?? 0) * 100) / 100}</strong> / {result.maxScore}
          </span>
        ) : null}
      </div>

      {result?.ok ? (
        <div className={`mt-3 rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${result.graded ? "bg-board/5 text-ink-soft" : "bg-accent-yellow/15 text-[#7a5b00]"}`}>
          {result.feedback}
          {result.graded ? null : <span className="mt-1 block text-xs">Non compté dans la maîtrise tant que la correction IA n&apos;est pas active.</span>}
        </div>
      ) : null}
      {result && !result.ok ? (
        <p role="alert" className="mt-3 text-sm text-[#a33c22]">{result.error}</p>
      ) : null}

      {exercise.best ? (
        <p className="mt-3 border-t border-ink/10 pt-2.5 text-xs text-ink-faint">
          Meilleure tentative : {exercise.best.score} / {exercise.best.max}
          {exercise.best.graded ? " (corrigée)" : " (non corrigée par IA)"}
        </p>
      ) : null}
    </article>
  );
}

export function ExerciseList({ exercises, courseId }: { exercises: ExerciseView[]; courseId: number }) {
  if (exercises.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink/20 bg-white/50 p-8 text-center text-sm text-ink-soft">
        Aucun exercice pour ce parcours. Validez un plan contenant des exercices, ou demandez au tuteur
        d&apos;en proposer.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {exercises.map((ex) => (
        <ExerciseCard key={ex.id} exercise={ex} courseId={courseId} />
      ))}
    </div>
  );
}

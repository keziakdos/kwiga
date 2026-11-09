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

type ScoreState = Record<number, { score: number; max: number; graded: boolean }>;

const TYPE_LABEL: Record<string, string> = {
  qcm: "QCM",
  open: "Question ouverte",
  subnet: "Calcul de sous-réseau",
  topology: "Lecture de topologie",
  troubleshooting: "Diagnostic de panne",
  lab: "Travaux pratiques",
};

function ExerciseCard({
  exercise,
  courseId,
  currentScore,
  onScored,
}: {
  exercise: ExerciseView;
  courseId: number;
  currentScore?: { score: number; max: number; graded: boolean };
  onScored: (exerciseId: number, score: number, max: number, graded: boolean) => void;
}) {
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy || !answer.trim()) return;
    setBusy(true);
    setResult(null);
    const res = await submitExerciseAction({ exerciseId: exercise.id, answer, courseId });
    setResult(res);
    if (res.ok && typeof res.score === "number" && typeof res.maxScore === "number") {
      onScored(exercise.id, res.score, res.maxScore, Boolean(res.graded));
    }
    setBusy(false);
  }

  const earned = currentScore?.graded ? currentScore.score : null;

  return (
    <article className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip bg-board/10 text-board-deep">{TYPE_LABEL[exercise.type] ?? exercise.type}</span>
          {earned !== null ? (
            <span className={`chip ${earned >= exercise.points ? "bg-board/15 text-board-deep" : "bg-accent-yellow/25 text-[#7a5b00]"}`}>
              {earned} / {exercise.points} pts
            </span>
          ) : (
            <span className="chip bg-ink/5 text-ink-faint">0 / {exercise.points} pts</span>
          )}
        </div>
        <span className="text-xs text-ink-faint">Barème : {exercise.points} point(s)</span>
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
            Cette tentative : <strong>{Math.round((result.score ?? 0) * 100) / 100}</strong> / {result.maxScore} pts
          </span>
        ) : null}
      </div>

      {result?.ok ? (
        <div className={`mt-3 rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${result.graded ? "bg-board/5 text-ink-soft" : "bg-accent-yellow/15 text-[#7a5b00]"}`}>
          {result.feedback}
          {result.graded ? null : <span className="mt-1 block text-xs">Non compté dans le total tant que la correction IA n&apos;est pas active.</span>}
        </div>
      ) : null}
      {result && !result.ok ? (
        <p role="alert" className="mt-3 text-sm text-[#a33c22]">{result.error}</p>
      ) : null}

      {exercise.best ? (
        <p className="mt-3 border-t border-ink/10 pt-2.5 text-xs text-ink-faint">
          Meilleure tentative enregistrée : {exercise.best.score} / {exercise.best.max}
          {exercise.best.graded ? " (corrigée)" : " (non corrigée par IA)"}
        </p>
      ) : null}
    </article>
  );
}

export function ExerciseList({ exercises, courseId }: { exercises: ExerciseView[]; courseId: number }) {
  const initial: ScoreState = {};
  for (const ex of exercises) {
    if (ex.best && ex.best.graded) {
      initial[ex.id] = { score: ex.best.score, max: ex.best.max, graded: true };
    }
  }
  const [scores, setScores] = useState<ScoreState>(initial);

  function handleScored(exerciseId: number, score: number, max: number, graded: boolean) {
    setScores((prev) => {
      const current = prev[exerciseId];
      if (!graded) {
        if (current?.graded) return prev;
        return { ...prev, [exerciseId]: { score: 0, max, graded: false } };
      }
      const best = Math.max(current?.graded ? current.score : 0, score);
      return { ...prev, [exerciseId]: { score: best, max, graded: true } };
    });
  }

  if (exercises.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink/20 bg-white/50 p-8 text-center text-sm text-ink-soft">
        Aucun exercice pour ce parcours. Validez un plan contenant des exercices, ou demandez au tuteur
        d&apos;en proposer.
      </div>
    );
  }

  const totalMax = exercises.reduce((sum, ex) => sum + ex.points, 0);
  const earned = exercises.reduce((sum, ex) => {
    const s = scores[ex.id];
    return sum + (s?.graded ? Math.min(s.score, ex.points) : 0);
  }, 0);
  const gradedCount = exercises.filter((ex) => scores[ex.id]?.graded).length;
  const percent = totalMax > 0 ? Math.round((earned / totalMax) * 100) : 0;

  return (
    <div className="space-y-4">
      <section className="card p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Total des points</p>
            <p className="mt-1 font-display text-3xl text-ink">
              {Math.round(earned * 100) / 100} <span className="text-lg text-ink-soft">/ {totalMax} pts</span>
            </p>
          </div>
          <div className="text-right text-xs text-ink-soft">
            <p>{gradedCount} / {exercises.length} exercices corrigés</p>
            <p className="mt-0.5 font-semibold text-ink">{percent} %</p>
          </div>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-board-soft transition-all duration-500" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-xs text-ink-faint">
          Le total additionne la meilleure tentative corrigée de chaque exercice. Les réponses non
          corrigées par l&apos;IA ne sont pas comptées.
        </p>
      </section>

      {exercises.map((ex) => (
        <ExerciseCard
          key={ex.id}
          exercise={ex}
          courseId={courseId}
          currentScore={scores[ex.id]}
          onScored={handleScored}
        />
      ))}
    </div>
  );
}

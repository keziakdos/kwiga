import { getDb } from "./db";
import { aiConfigured, callAi } from "./ai";
import { recomputeNotionMastery, recordActivity } from "./progress";

export type ExerciseRow = {
  id: number;
  course_id: number;
  notion_id: number | null;
  type: "qcm" | "open" | "subnet" | "topology" | "troubleshooting" | "lab";
  prompt: string;
  options_json: string | null;
  correct_json: string | null;
  criteria_json: string | null;
  points: number;
};

export function getExerciseForUser(exerciseId: number, userId: number): ExerciseRow | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT e.* FROM exercises e JOIN courses c ON c.id = e.course_id
       WHERE e.id = ? AND c.user_id = ?`,
    )
    .get(exerciseId, userId) as ExerciseRow | undefined;
  return row ?? null;
}

export type GradeResult = {
  score: number;
  maxScore: number;
  feedback: string;
  graded: boolean;
};

async function gradeWithAi(
  exercise: ExerciseRow,
  answer: string,
  userId: number,
): Promise<GradeResult> {
  const criteria = exercise.criteria_json ? JSON.parse(exercise.criteria_json) : null;
  const system = `Tu es un correcteur pédagogique réseaux en français. Évalue la réponse de l'apprenant.
Réponds UNIQUEMENT en JSON : {"score": nombre, "max": nombre, "feedback": "explication courte en français"}.
Sois exigeant mais bienveillant. Le feedback indique ce qui est correct, ce qui manque et ce qui est à corriger.
Ne délivre aucune certification.`;
  const user = `Exercice (${exercise.type}) : ${exercise.prompt}
Critères : ${criteria ?? "non fournis"}
Barème maximal : ${exercise.points}
Réponse de l'apprenant : ${answer.slice(0, 3000)}`;
  const result = await callAi(
    { userId, courseId: exercise.course_id, operation: "exercise_grading" },
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  );
  const text = result.text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "");
  try {
    const parsed = JSON.parse(text) as { score?: number; max?: number; feedback?: string };
    const max = Number.isFinite(parsed.max) ? Math.min(Number(parsed.max), exercise.points) : exercise.points;
    const score = Math.max(0, Math.min(Number(parsed.score ?? 0), max));
    return { score, maxScore: max, feedback: String(parsed.feedback ?? "").slice(0, 3000), graded: true };
  } catch {
    return {
      score: 0,
      maxScore: exercise.points,
      feedback: `Réponse enregistrée, mais la correction automatique n'a pas pu être interprétée. Barème : ${criteria ?? exercise.points}.`,
      graded: false,
    };
  }
}

function gradeDeterministic(exercise: ExerciseRow, answer: string): GradeResult | null {
  if (exercise.type === "qcm") {
    const correct = exercise.correct_json ? JSON.parse(exercise.correct_json) : null;
    if (typeof correct !== "string") return null;
    const ok = answer.trim().toLowerCase() === correct.trim().toLowerCase();
    return {
      score: ok ? exercise.points : 0,
      maxScore: exercise.points,
      feedback: ok
        ? "Bonne réponse."
        : `Réponse incorrecte. La bonne réponse est : ${correct}.`,
      graded: true,
    };
  }
  if (exercise.type === "subnet") {
    const correctRaw = exercise.correct_json ? JSON.parse(exercise.correct_json) : null;
    const correctNumber = Number.parseFloat(String(correctRaw).replace(",", "."));
    const match = answer.replace(",", ".").match(/-?\d+(?:\.\d+)?/);
    if (!Number.isFinite(correctNumber) || !match) return null;
    const given = Number.parseFloat(match[0]);
    const ok = Math.abs(given - correctNumber) < 0.0001;
    return {
      score: ok ? exercise.points : 0,
      maxScore: exercise.points,
      feedback: ok
        ? "Calcul correct."
        : `Résultat attendu : ${correctNumber}. Vérifiez la méthode (2^(32-préfixe) − 2 pour les hôtes utilisables).`,
      graded: true,
    };
  }
  return null;
}

export async function submitAttempt(params: {
  userId: number;
  exerciseId: number;
  answer: string;
}): Promise<{ attemptId: number; result: GradeResult; criteria: unknown }> {
  const db = getDb();
  const exercise = getExerciseForUser(params.exerciseId, params.userId);
  if (!exercise) throw new Error("Exercice introuvable");
  if (!params.answer.trim()) throw new Error("Réponse vide");

  const criteria = exercise.criteria_json ? JSON.parse(exercise.criteria_json) : null;
  let result = gradeDeterministic(exercise, params.answer);
  let graded = true;

  if (!result) {
    if (aiConfigured()) {
      result = await gradeWithAi(exercise, params.answer, params.userId);
      graded = result.graded;
    } else {
      result = {
        score: 0,
        maxScore: exercise.points,
        feedback:
          "Réponse enregistrée. La correction automatique par IA n'est pas configurée : ce critère est affiché pour vous auto-évaluer. Aucune maîtrise n'est validée automatiquement.",
        graded: false,
      };
      graded = false;
    }
  }

  const res = db
    .prepare(
      `INSERT INTO exercise_attempts (user_id, exercise_id, answer_json, score, max_score, feedback, ai_graded)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      params.userId,
      exercise.id,
      JSON.stringify({ answer: params.answer.slice(0, 8000) }),
      result.score,
      result.maxScore,
      result.feedback,
      graded ? 1 : 0,
    );

  if (exercise.notion_id) {
    recomputeNotionMastery(params.userId, exercise.notion_id);
    recordActivity({
      userId: params.userId,
      courseId: exercise.course_id,
      notionId: exercise.notion_id,
      type: "exercice",
      label: `Exercice ${exercise.type} — score ${result.score}/${result.maxScore}`,
    });
  }

  return { attemptId: Number(res.lastInsertRowid), result: { ...result, graded }, criteria };
}

export function getNotionExercises(notionId: number, userId: number): ExerciseRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT e.* FROM exercises e JOIN courses c ON c.id = e.course_id
       WHERE e.notion_id = ? AND c.user_id = ? ORDER BY e.id`,
    )
    .all(notionId, userId) as ExerciseRow[];
}

export function getBestAttempt(userId: number, exerciseId: number) {
  const db = getDb();
  return db
    .prepare(
      `SELECT score, max_score, feedback, ai_graded, created_at FROM exercise_attempts
       WHERE user_id = ? AND exercise_id = ? ORDER BY score DESC, created_at DESC LIMIT 1`,
    )
    .get(userId, exerciseId) as
    | { score: number; max_score: number; feedback: string; ai_graded: number; created_at: string }
    | undefined;
}

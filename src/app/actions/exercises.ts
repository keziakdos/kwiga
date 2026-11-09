"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { submitAttempt } from "@/lib/exercises";
import { BudgetError } from "@/lib/budget";
import { AiNotConfiguredError } from "@/lib/ai";

export type SubmitResult = {
  ok: boolean;
  score?: number;
  maxScore?: number;
  feedback?: string;
  graded?: boolean;
  criteria?: unknown;
  error?: string;
};

export async function submitExerciseAction(input: {
  exerciseId: number;
  answer: string;
  courseId: number;
}): Promise<SubmitResult> {
  const user = await requireUser();
  try {
    const { result, criteria } = await submitAttempt({
      userId: user.id,
      exerciseId: input.exerciseId,
      answer: input.answer,
    });
    revalidatePath(`/parcours/${input.courseId}/exercices`);
    return {
      ok: true,
      score: result.score,
      maxScore: result.maxScore,
      feedback: result.feedback,
      graded: result.graded,
      criteria,
    };
  } catch (e) {
    const message =
      e instanceof AiNotConfiguredError
        ? "La correction par IA n'est pas configurée."
        : e instanceof BudgetError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Impossible d'enregistrer la réponse.";
    return { ok: false, error: message };
  }
}

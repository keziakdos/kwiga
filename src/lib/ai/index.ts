import { config, aiConfigured } from "../config";
import {
  estimateMaxCost,
  estimateTokensFromText,
  reserveCost,
  settleCost,
  failReservation,
} from "../budget";
import { getDb } from "../db";
import {
  AiNotConfiguredError,
  AiProviderError,
  estimateMessages,
  getProvider,
  type ChatMessage,
} from "./provider";

export { AiNotConfiguredError, AiProviderError } from "./provider";
export type { ChatMessage } from "./provider";
export { aiConfigured } from "../config";

export type AiCallContext = {
  userId: number | null;
  courseId?: number | null;
  operation: string;
};

export type AiCallResult = {
  text: string;
  inputTokens: number;
  outputTokens: number;
  costEur: number;
  provider: string;
  model: string;
};

function logAiError(message: string, context: Record<string, unknown>) {
  try {
    getDb()
      .prepare("INSERT INTO error_logs (level, message, context_json) VALUES ('error', ?, ?)")
      .run(message.slice(0, 500), JSON.stringify(context).slice(0, 2000));
  } catch {
    // jamais d'échec bloquant sur la journalisation
  }
}

export async function callAi(context: AiCallContext, messages: ChatMessage[]): Promise<AiCallResult> {
  if (!aiConfigured()) throw new AiNotConfiguredError();
  const provider = getProvider();

  const estimatedInput = Math.min(estimateMessages(messages), config.ai.maxInputTokens);
  const maxCost = estimateMaxCost(
    estimatedInput,
    config.ai.maxOutputTokens,
    config.ai.priceInputEurPerMTok,
    config.ai.priceOutputEurPerMTok,
  );

  const reservationId = reserveCost(context.userId, context.operation, maxCost);

  try {
    const result = await provider.chat(messages, {
      maxOutputTokens: config.ai.maxOutputTokens,
      timeoutMs: config.ai.timeoutMs,
    });
    const cost = estimateMaxCost(
      result.inputTokens,
      result.outputTokens,
      config.ai.priceInputEurPerMTok,
      config.ai.priceOutputEurPerMTok,
    );
    settleCost({
      reservationId,
      userId: context.userId,
      courseId: context.courseId ?? null,
      operation: context.operation,
      provider: provider.id,
      model: provider.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costEur: cost,
    });
    return {
      text: result.text,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costEur: cost,
      provider: provider.id,
      model: provider.model,
    };
  } catch (error) {
    const status = error instanceof AiProviderError ? error.status : undefined;
    const billable = status !== undefined && status >= 400 && status < 500 && status !== 401 && status !== 403;
    if (billable) {
      const cost = estimateMaxCost(
        estimateTokensFromText(messages.map((m) => m.content).join(" ")),
        Math.min(300, config.ai.maxOutputTokens),
        config.ai.priceInputEurPerMTok,
        config.ai.priceOutputEurPerMTok,
      );
      failReservation(reservationId, true, {
        userId: context.userId,
        courseId: context.courseId ?? null,
        operation: context.operation,
        provider: provider.id,
        model: provider.model,
        inputTokens: estimateMessages(messages),
        outputTokens: 0,
        costEur: cost,
      });
    } else {
      failReservation(reservationId, false);
    }
    logAiError(error instanceof Error ? error.message : "Erreur IA inconnue", {
      operation: context.operation,
      provider: provider.id,
      status,
    });
    throw error;
  }
}

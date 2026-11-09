import { config, aiConfigured } from "../config";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type AiResult = {
  text: string;
  inputTokens: number;
  outputTokens: number;
};

export class AiNotConfiguredError extends Error {
  constructor() {
    super(
      "Le tuteur IA n'est pas configuré. L'administrateur doit renseigner AI_PROVIDER, AI_MODEL et AI_API_KEY.",
    );
  }
}

export class AiProviderError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

export interface AiProvider {
  id: string;
  model: string;
  chat(messages: ChatMessage[], opts: { maxOutputTokens: number; timeoutMs: number }): Promise<AiResult>;
}

async function postJson(url: string, body: unknown, headers: Record<string, string>, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }
    if (!res.ok) {
      const msg =
        parsed && typeof parsed === "object" && "error" in parsed
          ? JSON.stringify((parsed as { error: unknown }).error).slice(0, 300)
          : text.slice(0, 300);
      throw new AiProviderError(`Erreur du fournisseur IA (${res.status}): ${msg}`, res.status);
    }
    return parsed as Record<string, unknown>;
  } finally {
    clearTimeout(timer);
  }
}

class OpenRouterProvider implements AiProvider {
  id = "openrouter";
  constructor(public model: string, private apiKey: string) {}

  async chat(messages: ChatMessage[], opts: { maxOutputTokens: number; timeoutMs: number }): Promise<AiResult> {
    const data = await postJson(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: this.model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: opts.maxOutputTokens,
        temperature: 0.4,
      },
      { authorization: `Bearer ${this.apiKey}`, "http-referer": config.appUrl, "x-title": "Kwiga" },
      opts.timeoutMs,
    );
    const choices = data.choices as Array<{ message?: { content?: string } }> | undefined;
    const text = choices?.[0]?.message?.content ?? "";
    const usage = data.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
    return {
      text,
      inputTokens: usage?.prompt_tokens ?? estimateMessages(messages),
      outputTokens: usage?.completion_tokens ?? Math.ceil(text.length / 4),
    };
  }
}

class GoogleProvider implements AiProvider {
  id = "google";
  constructor(public model: string, private apiKey: string) {}

  async chat(messages: ChatMessage[], opts: { maxOutputTokens: number; timeoutMs: number }): Promise<AiResult> {
    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      this.model,
    )}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const data = await postJson(
      url,
      {
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents,
        generationConfig: {
          maxOutputTokens: opts.maxOutputTokens,
          temperature: 0.4,
        },
      },
      {},
      opts.timeoutMs,
    );
    const candidates = data.candidates as
      | Array<{ content?: { parts?: Array<{ text?: string }> } }>
      | undefined;
    const text =
      candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    const usage = data.usageMetadata as
      | { promptTokenCount?: number; candidatesTokenCount?: number }
      | undefined;
    return {
      text,
      inputTokens: usage?.promptTokenCount ?? estimateMessages(messages),
      outputTokens: usage?.candidatesTokenCount ?? Math.ceil(text.length / 4),
    };
  }
}

class NullProvider implements AiProvider {
  id = "null";
  model = "non-configure";
  async chat(): Promise<AiResult> {
    throw new AiNotConfiguredError();
  }
}

export function estimateMessages(messages: ChatMessage[]): number {
  return Math.max(1, Math.ceil(messages.reduce((n, m) => n + m.content.length, 0) / 4));
}

export function getProvider(): AiProvider {
  if (!aiConfigured()) return new NullProvider();
  if (config.ai.provider === "openrouter") {
    return new OpenRouterProvider(config.ai.model, config.ai.apiKey);
  }
  if (config.ai.provider === "google") {
    return new GoogleProvider(config.ai.model, config.ai.apiKey);
  }
  return new NullProvider();
}

import path from "node:path";

function int(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
}

function float(value: string | undefined, fallback: number): number {
  const n = Number.parseFloat(value ?? "");
  return Number.isFinite(n) ? n : fallback;
}

const dataDir = path.resolve(process.env.DATA_DIR || "./data");

export const config = {
  appUrl: process.env.APP_URL || "http://localhost:3000",
  isProd: process.env.NODE_ENV === "production",
  sessionSecret: process.env.SESSION_SECRET || "",
  dataDir,
  dbPath: process.env.DB_PATH || path.join(dataDir, "kwiga.sqlite"),
  uploadsDir: path.join(dataDir, "uploads"),
  sessionTtlDays: int(process.env.SESSION_TTL_DAYS, 14),

  ai: {
    provider: (process.env.AI_PROVIDER || "null") as "null" | "openrouter" | "google",
    model: process.env.AI_MODEL || "",
    apiKey: process.env.AI_API_KEY || "",
    priceInputEurPerMTok: float(process.env.AI_PRICE_INPUT_EUR_PER_MTOK, 0),
    priceOutputEurPerMTok: float(process.env.AI_PRICE_OUTPUT_EUR_PER_MTOK, 0),
    maxInputTokens: int(process.env.AI_MAX_INPUT_TOKENS, 6000),
    maxOutputTokens: int(process.env.AI_MAX_OUTPUT_TOKENS, 1200),
    timeoutMs: int(process.env.AI_TIMEOUT_MS, 60000),
  },

  images: {
    provider: (process.env.IMAGE_PROVIDER || "null") as "null" | "google",
    model: process.env.IMAGE_MODEL || "gemini-nano-banana-2.1",
    apiKey: process.env.IMAGE_API_KEY || process.env.AI_API_KEY || "",
    costEurPerImage: float(process.env.IMAGE_COST_EUR, 0.04),
    maxPerNotion: int(process.env.IMAGE_MAX_PER_NOTION, 6),
  },

  limits: {
    maxActiveCourses: int(process.env.MAX_ACTIVE_COURSES, 3),
    maxPdfMb: int(process.env.MAX_PDF_MB, 25),
    maxPdfPages: int(process.env.MAX_PDF_PAGES, 400),
    maxNotesKb: int(process.env.MAX_NOTES_KB, 200),
    maxUploadsPerUser: int(process.env.MAX_UPLOADS_PER_USER, 50),
    maxConcurrentJobs: int(process.env.MAX_CONCURRENT_JOBS, 1),
    loginMaxAttempts: int(process.env.LOGIN_MAX_ATTEMPTS, 8),
    loginWindowMinutes: int(process.env.LOGIN_WINDOW_MINUTES, 15),
  },
} as const;

export function imageConfigured(): boolean {
  return config.images.provider !== "null" && config.images.apiKey.length > 0 && config.images.model.length > 0;
}

export function aiConfigured(): boolean {
  return (
    config.ai.provider !== "null" &&
    config.ai.apiKey.length > 0 &&
    config.ai.model.length > 0
  );
}

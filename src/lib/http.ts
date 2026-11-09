import { config } from "./config";

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) {
    const referer = request.headers.get("referer");
    if (!referer) return;
    try {
      const refOrigin = new URL(referer).origin;
      const expected = new URL(config.appUrl).origin;
      if (refOrigin !== expected) throw new Error("Origine non autorisée");
      return;
    } catch {
      throw new Error("Origine non autorisée");
    }
  }
  let expected: string;
  try {
    expected = new URL(config.appUrl).origin;
  } catch {
    expected = "";
  }
  if (expected && origin !== expected) {
    throw new Error("Origine non autorisée");
  }
}

export function jsonError(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

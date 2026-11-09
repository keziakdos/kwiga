import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { getDb } from "./db";
import { config } from "./config";

export const SESSION_COOKIE = "kwiga_session";

export type SessionUser = {
  id: number;
  username: string;
  display_name: string;
  role: "admin" | "learner";
  status: "active" | "suspended";
  must_change_password: number;
};

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createSessionSync(userId: number, ip: string | null, userAgent: string | null): { token: string; expiresAt: string } {
  const token = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + config.sessionTtlDays * 86400_000);
  const db = getDb();
  db.prepare(
    "INSERT INTO sessions (token_hash, user_id, expires_at, ip, user_agent) VALUES (?, ?, ?, ?, ?)",
  ).run(hashToken(token), userId, expires.toISOString(), ip, userAgent);
  return { token, expiresAt: expires.toISOString() };
}

export function setSessionCookie(token: string, expiresAt: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: config.isProd,
    sameSite: "lax" as const,
    path: "/",
    expires: new Date(expiresAt),
  };
}

export function destroySessionSync(token: string) {
  const db = getDb();
  db.prepare("UPDATE sessions SET revoked = 1 WHERE token_hash = ?").run(hashToken(token));
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.id, u.username, u.display_name, u.role, u.status, u.must_change_password
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.revoked = 0 AND datetime(s.expires_at) > datetime('now')
         AND u.status = 'active'`,
    )
    .get(hashToken(token)) as SessionUser | undefined;
  return row ?? null;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError(401, "Authentification requise");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") throw new AuthError(403, "Accès administrateur requis");
  return user;
}

export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function clientMeta(): Promise<{ ip: string | null; ua: string | null }> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : h.get("x-real-ip");
  return { ip, ua: h.get("user-agent") };
}

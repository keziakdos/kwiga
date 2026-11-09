import { getDb } from "./db";
import { config } from "./config";

export function recentFailureCount(username: string, ip: string | null): number {
  const db = getDb();
  const since = new Date(Date.now() - config.limits.loginWindowMinutes * 60_000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM login_attempts
       WHERE success = 0 AND created_at > ? AND (username = ? COLLATE NOCASE OR ip = ?)`,
    )
    .get(since, username, ip) as { n: number };
  return row.n;
}

export function recordLoginAttempt(username: string, ip: string | null, success: boolean) {
  const db = getDb();
  db.prepare("INSERT INTO login_attempts (username, ip, success) VALUES (?, ?, ?)").run(
    username,
    ip,
    success ? 1 : 0,
  );
}

export function isLocked(username: string, ip: string | null): boolean {
  return recentFailureCount(username, ip) >= config.limits.loginMaxAttempts;
}

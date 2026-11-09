import { getDb } from "./db";
import { verifyPassword } from "./password";
import { isLocked, recordLoginAttempt } from "./rate-limit";

export type AuthenticatedUser = {
  id: number;
  username: string;
  status: string;
  role: "admin" | "learner";
  must_change_password: number;
};

export type AuthOutcome = { ok: true; user: AuthenticatedUser } | { ok: false; error: string };

export async function authenticateUser(
  username: string,
  password: string,
  ip: string | null,
): Promise<AuthOutcome> {
  if (!username || !password) return { ok: false, error: "Identifiant et mot de passe requis." };
  if (isLocked(username, ip)) {
    return { ok: false, error: "Trop de tentatives. Réessayez dans quelques minutes." };
  }

  const db = getDb();
  const user = db
    .prepare(
      "SELECT id, username, password_hash, status, role, must_change_password FROM users WHERE username = ? COLLATE NOCASE",
    )
    .get(username) as
    | (AuthenticatedUser & { password_hash: string })
    | undefined;

  const ok = user ? await verifyPassword(user.password_hash, password) : false;
  const active = Boolean(user && user.status === "active");
  recordLoginAttempt(username, ip, ok && active);

  if (!user || !ok) return { ok: false, error: "Identifiant ou mot de passe incorrect." };
  if (!active) return { ok: false, error: "Ce compte est suspendu. Contactez l'administrateur." };

  return {
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      status: user.status,
      role: user.role,
      must_change_password: user.must_change_password,
    },
  };
}

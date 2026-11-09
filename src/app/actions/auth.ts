"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { verifyPassword, hashPassword, generateTemporaryPassword } from "@/lib/password";
import { createSessionSync, setSessionCookie, destroySessionSync, SESSION_COOKIE, getSessionUser, clientMeta } from "@/lib/session";
import { assertStrongPassword } from "@/lib/validation";
import { recordActivity } from "@/lib/progress";
import { authenticateUser } from "@/lib/login";

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const meta = await clientMeta();
  const outcome = await authenticateUser(username, password, meta.ip);
  if (!outcome.ok) return { error: outcome.error };
  const user = outcome.user;

  const db = getDb();
  const { token, expiresAt } = createSessionSync(user.id, meta.ip, meta.ua);
  const store = await cookies();
  store.set(setSessionCookie(token, expiresAt));
  db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(user.id);
  recordActivity({ userId: user.id, type: "connexion", label: "Connexion" });

  redirect("/tableau-de-bord");
}

export async function logoutAction() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) destroySessionSync(token);
  store.delete(SESSION_COOKIE);
  redirect("/connexion");
}

export type ChangePasswordState = { error?: string; success?: string };

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const user = await getSessionUser();
  if (!user) redirect("/connexion");
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (next !== confirm) return { error: "Les deux nouveaux mots de passe diffèrent." };
  const err = assertStrongPassword(next);
  if (err) return { error: err };

  const db = getDb();
  if (!user.must_change_password) {
    const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(user.id) as { password_hash: string };
    if (!(await verifyPassword(row.password_hash, current))) {
      return { error: "Mot de passe actuel incorrect." };
    }
  }
  const newHash = await hashPassword(next);
  db.prepare(
    "UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = datetime('now') WHERE id = ?",
  ).run(newHash, user.id);

  db.prepare(
    "INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, detail) VALUES (?, 'changement_mot_de_passe', 'user', ?, 'Par l''utilisateur')",
  ).run(user.id, String(user.id));
  return { success: "Mot de passe mis à jour." };
}

export async function updateProfileAction(_prev: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const user = await getSessionUser();
  if (!user) redirect("/connexion");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  if (displayName.length < 2) return { error: "Le nom affiché est trop court." };
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Adresse e-mail invalide." };
  getDb()
    .prepare("UPDATE users SET display_name = ?, email = ?, updated_at = datetime('now') WHERE id = ?")
    .run(displayName.slice(0, 80), email || null, user.id);
  return { success: "Profil mis à jour." };
}

export { generateTemporaryPassword };

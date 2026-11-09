"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { hashPassword, generateTemporaryPassword } from "@/lib/password";
import { assertStrongPassword } from "@/lib/validation";

function audit(adminId: number, action: string, targetType: string, targetId: string, detail: string, ip?: string | null) {
  getDb()
    .prepare(
      "INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, detail, ip) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(adminId, action, targetType, targetId, detail.slice(0, 500), ip ?? null);
}

export type AdminState = { ok: boolean; error?: string; message?: string; tempPassword?: string; username?: string };

export async function createUserAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const username = String(formData.get("username") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim() || username;
  const role = String(formData.get("role") ?? "learner");
  const provided = String(formData.get("password") ?? "");

  if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username)) {
    return { ok: false, error: "Identifiant invalide (3 à 40 caractères : lettres, chiffres, . _ -)." };
  }
  if (!["admin", "learner"].includes(role)) return { ok: false, error: "Rôle invalide." };

  const password = provided || generateTemporaryPassword();
  if (provided) {
    const err = assertStrongPassword(provided);
    if (err) return { ok: false, error: err };
  }

  const db = getDb();
  const exists = db.prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE").get(username);
  if (exists) return { ok: false, error: "Cet identifiant existe déjà." };

  const hash = await hashPassword(password);
  const res = db
    .prepare(
      `INSERT INTO users (username, display_name, role, password_hash, must_change_password)
       VALUES (?, ?, ?, ?, 1)`,
    )
    .run(username, displayName.slice(0, 80), role, hash);
  audit(admin.id, "creation_utilisateur", "user", String(res.lastInsertRowid), `Création de ${username} (${role})`);
  revalidatePath("/admin/utilisateurs");
  return {
    ok: true,
    message: `Compte « ${username} » créé. Transmettez le mot de passe temporaire par un canal sûr.`,
    tempPassword: provided ? undefined : password,
    username,
  };
}

export async function setUserStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = Number(formData.get("user_id"));
  const status = String(formData.get("status"));
  if (![ "active", "suspended" ].includes(status)) return;
  const db = getDb();
  const target = db.prepare("SELECT username FROM users WHERE id = ?").get(userId) as { username: string } | undefined;
  if (!target) return;
  if (userId === admin.id && status === "suspended") return;
  db.prepare("UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, userId);
  if (status === "suspended") db.prepare("UPDATE sessions SET revoked = 1 WHERE user_id = ?").run(userId);
  audit(admin.id, status === "suspended" ? "suspension_utilisateur" : "reactivation_utilisateur", "user", String(userId), target.username);
  revalidatePath("/admin/utilisateurs");
}

export async function resetPasswordAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const userId = Number(formData.get("user_id"));
  const db = getDb();
  const target = db.prepare("SELECT username FROM users WHERE id = ?").get(userId) as { username: string } | undefined;
  if (!target) return { ok: false, error: "Utilisateur introuvable." };
  const temp = generateTemporaryPassword();
  const hash = await hashPassword(temp);
  db.prepare(
    "UPDATE users SET password_hash = ?, must_change_password = 1, updated_at = datetime('now') WHERE id = ?",
  ).run(hash, userId);
  db.prepare("UPDATE sessions SET revoked = 1 WHERE user_id = ?").run(userId);
  audit(admin.id, "reinitialisation_mot_de_passe", "user", String(userId), target.username);
  revalidatePath("/admin/utilisateurs");
  return { ok: true, message: `Mot de passe réinitialisé pour « ${target.username} ».`, tempPassword: temp, username: target.username };
}

export async function setUserRoleAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = Number(formData.get("user_id"));
  const role = String(formData.get("role"));
  if (!["admin", "learner"].includes(role)) return;
  if (userId === admin.id && role !== "admin") return;
  const db = getDb();
  const target = db.prepare("SELECT username FROM users WHERE id = ?").get(userId) as { username: string } | undefined;
  if (!target) return;
  db.prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?").run(role, userId);
  audit(admin.id, "changement_role", "user", String(userId), `${target.username} → ${role}`);
  revalidatePath("/admin/utilisateurs");
}

export async function deleteUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = Number(formData.get("user_id"));
  const confirm = String(formData.get("confirm") ?? "");
  if (userId === admin.id) return;
  const db = getDb();
  const target = db.prepare("SELECT username FROM users WHERE id = ?").get(userId) as { username: string } | undefined;
  if (!target || confirm !== target.username) return;
  db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  audit(admin.id, "suppression_utilisateur", "user", String(userId), target.username);
  revalidatePath("/admin/utilisateurs");
}

export async function updateSettingsAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const maxActive = Number(formData.get("max_active_courses"));
  const maxPdfMb = Number(formData.get("max_pdf_mb"));
  const maxPdfPages = Number(formData.get("max_pdf_pages"));
  const maxUploads = Number(formData.get("max_uploads"));
  if (![maxActive, maxPdfMb, maxPdfPages, maxUploads].every((n) => Number.isFinite(n) && n > 0)) {
    return { ok: false, error: "Valeurs invalides." };
  }
  const db = getDb();
  const upsert = db.prepare(
    "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  );
  const tx = db.transaction(() => {
    upsert.run("max_active_courses", String(Math.min(maxActive, 20)));
    upsert.run("max_pdf_mb", String(Math.min(maxPdfMb, 200)));
    upsert.run("max_pdf_pages", String(Math.min(maxPdfPages, 2000)));
    upsert.run("max_uploads", String(Math.min(maxUploads, 500)));
  });
  tx();
  audit(admin.id, "modification_limites", "settings", "global", `parcours=${maxActive}, pdf=${maxPdfMb}Mo, pages=${maxPdfPages}, uploads=${maxUploads}`);
  revalidatePath("/admin/configuration");
  return { ok: true, message: "Configuration enregistrée." };
}

export async function updateBudgetAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const cap = Number(formData.get("monthly_cap_eur"));
  const margin = Number(formData.get("margin_pct"));
  const currency = String(formData.get("currency") ?? "EUR").slice(0, 8);
  const fx = Number(formData.get("fx_rate"));
  const periodStart = String(formData.get("period_start") ?? "");
  if (!Number.isFinite(cap) || cap <= 0) return { ok: false, error: "Plafond invalide." };
  if (!Number.isFinite(margin) || margin < 0 || margin > 90) return { ok: false, error: "Marge invalide (0–90)." };
  if (!Number.isFinite(fx) || fx <= 0) return { ok: false, error: "Taux de conversion invalide." };
  const db = getDb();
  db.prepare(
    `UPDATE budget_settings SET monthly_cap_eur = ?, margin_pct = ?, currency = ?, fx_rate = ?, period_start = ? WHERE id = 1`,
  ).run(cap, margin, currency, fx, periodStart || new Date().toISOString().slice(0, 7) + "-01");
  audit(admin.id, "modification_budget", "budget", "1", `plafond=${cap}€, marge=${margin}%`);
  revalidatePath("/admin/budget");
  return { ok: true, message: "Budget mis à jour." };
}

export async function addExpenseAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const label = String(formData.get("label") ?? "").trim();
  const amount = Number(formData.get("amount_eur"));
  const category = String(formData.get("category") ?? "autre");
  if (!label) return { ok: false, error: "Libellé requis." };
  if (!Number.isFinite(amount) || amount < 0) return { ok: false, error: "Montant invalide." };
  if (!["fixe", "autre", "dev"].includes(category)) return { ok: false, error: "Catégorie invalide." };
  const db = getDb();
  db.prepare("INSERT INTO budget_expenses (label, amount_eur, category) VALUES (?, ?, ?)").run(
    label.slice(0, 120),
    amount,
    category,
  );
  audit(admin.id, "ajout_depense", "budget", "expense", `${label} = ${amount}€ (${category})`);
  revalidatePath("/admin/budget");
  return { ok: true, message: "Dépense ajoutée." };
}

export async function deleteExpenseAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = Number(formData.get("expense_id"));
  getDb().prepare("DELETE FROM budget_expenses WHERE id = ?").run(id);
  audit(admin.id, "suppression_depense", "budget", String(id), "Suppression");
  revalidatePath("/admin/budget");
}

export async function addExampleDocumentAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const domain = String(formData.get("domain") ?? "reseau");
  const description = String(formData.get("description") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  if (!title) return { ok: false, error: "Titre requis." };
  if (!["reseau", "cybersecurite", "webmaster"].includes(domain)) return { ok: false, error: "Domaine invalide." };
  if (url && !/^https?:\/\//i.test(url)) return { ok: false, error: "URL invalide (http/https)." };
  const db = getDb();
  const res = db
    .prepare("INSERT INTO example_documents (title, domain, description, url) VALUES (?, ?, ?, ?)")
    .run(title.slice(0, 160), domain, description.slice(0, 1000) || null, url || null);
  audit(admin.id, "ajout_document_exemple", "example_document", String(res.lastInsertRowid), title);
  revalidatePath("/admin/documents-exemple");
  return { ok: true, message: "Document d'exemple ajouté." };
}

export async function deleteExampleDocumentAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = Number(formData.get("example_id"));
  getDb().prepare("DELETE FROM example_documents WHERE id = ?").run(id);
  audit(admin.id, "suppression_document_exemple", "example_document", String(id), "Suppression");
  revalidatePath("/admin/documents-exemple");
}

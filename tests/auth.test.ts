import { describe, it, expect, beforeEach } from "vitest";
import { getDb, closeDb } from "@/lib/db";
import { hashPassword, verifyPassword, generateTemporaryPassword } from "@/lib/password";

function reset() {
  const db = getDb();
  db.exec("DELETE FROM exercise_attempts; DELETE FROM exercises; DELETE FROM notion_progress; DELETE FROM notion_notes; DELETE FROM notions; DELETE FROM modules; DELETE FROM plans; DELETE FROM document_chunks; DELETE FROM document_pages; DELETE FROM documents; DELETE FROM courses; DELETE FROM sessions; DELETE FROM login_attempts; DELETE FROM revisions; DELETE FROM ai_usage; DELETE FROM ai_reservations; DELETE FROM budget_expenses; DELETE FROM admin_audit_log; DELETE FROM chat_messages; DELETE FROM chat_threads; DELETE FROM users;");
}

beforeEach(reset);

describe("authentification", () => {
  it("hache et vérifie un mot de passe Argon2id", async () => {
    const hash = await hashPassword("MotDePasseSolide123");
    expect(hash).not.toContain("MotDePasseSolide123");
    expect(await verifyPassword(hash, "MotDePasseSolide123")).toBe(true);
    expect(await verifyPassword(hash, "mauvais")).toBe(false);
  });

  it("génère des mots de passe temporaires distincts et robustes", () => {
    const a = generateTemporaryPassword();
    const b = generateTemporaryPassword();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(16);
  });

  it("refuse un mot de passe incorrect pour un utilisateur stocké", async () => {
    const db = getDb();
    const hash = await hashPassword("SecretValide123");
    db.prepare("INSERT INTO users (username, display_name, password_hash) VALUES ('u1', 'U1', ?)").run(hash);
    const row = db.prepare("SELECT password_hash FROM users WHERE username = 'u1'").get() as { password_hash: string };
    expect(await verifyPassword(row.password_hash, "SecretValide123")).toBe(true);
    expect(await verifyPassword(row.password_hash, "SecretValide124")).toBe(false);
  });
});

describe("persistance après fermeture", () => {
  it("retrouve les données après réouverture de la base", async () => {
    const db = getDb();
    const hash = await hashPassword("Persistance123A");
    db.prepare("INSERT INTO users (username, display_name, password_hash) VALUES ('persist', 'Persist', ?)").run(hash);
    closeDb();
    const db2 = getDb();
    const row = db2.prepare("SELECT username FROM users WHERE username = 'persist'").get() as { username: string } | undefined;
    expect(row?.username).toBe("persist");
  });
});

describe("connexion", () => {
  it("accepte les bons identifiants et refuse les mauvais", async () => {
    const { authenticateUser } = await import("@/lib/login");
    const db = getDb();
    const hash = await hashPassword("BonMotDePasse123");
    db.prepare("INSERT INTO users (username, display_name, password_hash) VALUES ('login1', 'L1', ?)").run(hash);
    const ok = await authenticateUser("login1", "BonMotDePasse123", "10.0.0.1");
    expect(ok.ok).toBe(true);
    const ko = await authenticateUser("login1", "MauvaisMotDePasse", "10.0.0.1");
    expect(ko.ok).toBe(false);
    const unknown = await authenticateUser("inconnu", "BonMotDePasse123", "10.0.0.2");
    expect(unknown.ok).toBe(false);
  });

  it("refuse un compte suspendu", async () => {
    const { authenticateUser } = await import("@/lib/login");
    const db = getDb();
    const hash = await hashPassword("BonMotDePasse123");
    db.prepare("INSERT INTO users (username, display_name, password_hash, status) VALUES ('susp', 'S', ?, 'suspended')").run(hash);
    const res = await authenticateUser("susp", "BonMotDePasse123", "10.0.0.3");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/suspendu/);
  });

  it("verrouille après trop de tentatives", async () => {
    const { authenticateUser } = await import("@/lib/login");
    const db = getDb();
    const hash = await hashPassword("BonMotDePasse123");
    db.prepare("INSERT INTO users (username, display_name, password_hash) VALUES ('brute', 'B', ?)").run(hash);
    for (let i = 0; i < 8; i++) {
      await authenticateUser("brute", "mauvais", "10.0.0.4");
    }
    const res = await authenticateUser("brute", "BonMotDePasse123", "10.0.0.4");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/Trop de tentatives/);
  });
});

import { loadEnv, prompt, assertStrongPassword } from "./_env";

async function main() {
  loadEnv();
  const { getDb } = await import("../src/lib/db");
  const { hashPassword } = await import("../src/lib/password");

  const username = process.env.ADMIN_USERNAME || (await prompt("Identifiant administrateur: "));
  const displayName = process.env.ADMIN_DISPLAY_NAME || username;
  let password = process.env.ADMIN_PASSWORD || "";
  if (!password) password = await prompt("Mot de passe (masqué): ", { hidden: true });
  const err = assertStrongPassword(password);
  if (err) throw new Error(err);

  const db = getDb();
  const hash = await hashPassword(password);
  const existing = db
    .prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE")
    .get(username.trim()) as { id: number } | undefined;

  if (existing) {
    db.prepare(
      `UPDATE users SET role = 'admin', status = 'active', password_hash = ?,
       must_change_password = 0, updated_at = datetime('now') WHERE id = ?`,
    ).run(hash, existing.id);
    console.log(`Compte administrateur "${username}" mis à jour (id ${existing.id}).`);
  } else {
    const res = db
      .prepare(
        `INSERT INTO users (username, display_name, role, password_hash, must_change_password)
         VALUES (?, ?, 'admin', ?, 0)`,
      )
      .run(username.trim(), displayName, hash);
    console.log(`Compte administrateur "${username}" créé (id ${res.lastInsertRowid}).`);
    db.prepare(
      `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, detail)
       VALUES (?, 'creation_admin_cli', 'user', ?, 'Création via commande sécurisée')`,
    ).run(Number(res.lastInsertRowid), String(res.lastInsertRowid));
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("Erreur:", e instanceof Error ? e.message : e);
  process.exit(1);
});

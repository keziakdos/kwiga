import { loadEnv, prompt, assertStrongPassword } from "./_env";

async function main() {
  loadEnv();
  const { getDb } = await import("../src/lib/db");
  const { hashPassword, generateTemporaryPassword } = await import("../src/lib/password");

  const db = getDb();

  async function upsertUser(params: {
    username: string;
    displayName: string;
    role: "admin" | "learner";
    password: string;
    mustChange: boolean;
  }) {
    const existing = db
      .prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE")
      .get(params.username) as { id: number } | undefined;
    const hash = await hashPassword(params.password);
    if (existing) {
      db.prepare(
        `UPDATE users SET display_name = ?, role = ?, password_hash = ?, status = 'active',
         must_change_password = ?, updated_at = datetime('now') WHERE id = ?`,
      ).run(params.displayName, params.role, hash, params.mustChange ? 1 : 0, existing.id);
      return { id: existing.id, created: false };
    }
    const res = db
      .prepare(
        `INSERT INTO users (username, display_name, role, password_hash, must_change_password)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(params.username, params.displayName, params.role, hash, params.mustChange ? 1 : 0);
    return { id: Number(res.lastInsertRowid), created: true };
  }

  const adminUsername = process.env.ADMIN_USERNAME || (await prompt("Identifiant administrateur: "));
  if (!adminUsername) throw new Error("Identifiant administrateur requis.");

  let adminPassword = process.env.ADMIN_PASSWORD || "";
  if (!adminPassword) adminPassword = await prompt("Mot de passe administrateur (masqué): ", { hidden: true });
  const err = assertStrongPassword(adminPassword);
  if (err) throw new Error(err);

  const admin = await upsertUser({
    username: adminUsername.trim(),
    displayName: process.env.ADMIN_DISPLAY_NAME || adminUsername.trim(),
    role: "admin",
    password: adminPassword,
    mustChange: false,
  });
  console.log(`${admin.created ? "Créé" : "Mis à jour"} : administrateur "${adminUsername}" (id ${admin.id}).`);

  const learnerUsername = process.env.LEARNER_USERNAME || "didioos";
  const learnerPassword = process.env.LEARNER_PASSWORD || generateTemporaryPassword();
  const learner = await upsertUser({
    username: learnerUsername.trim(),
    displayName: process.env.LEARNER_DISPLAY_NAME || learnerUsername.trim(),
    role: "learner",
    password: learnerPassword,
    mustChange: true,
  });
  console.log(`${learner.created ? "Créé" : "Mis à jour"} : apprenant "${learnerUsername}" (id ${learner.id}).`);
  if (!process.env.LEARNER_PASSWORD) {
    console.log(`Mot de passe temporaire de "${learnerUsername}" (à changer à la 1re connexion) : ${learnerPassword}`);
  }

  db.prepare(
    `INSERT INTO budget_settings (id, monthly_cap_eur, margin_pct, currency, fx_rate, period_start)
     VALUES (1, 10, 10, 'EUR', 1, ?)
     ON CONFLICT(id) DO NOTHING`,
  ).run(new Date().toISOString().slice(0, 7) + "-01");

  console.log("Initialisation terminée. Aucun secret n'est écrit en base en clair.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Erreur d'initialisation:", e instanceof Error ? e.message : e);
  process.exit(1);
});

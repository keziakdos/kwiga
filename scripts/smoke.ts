import { loadEnv } from "./_env";

async function main() {
  loadEnv();
  const { getDb } = await import("../src/lib/db");
  const { createCourse } = await import("../src/lib/courses");
  const { saveText } = await import("../src/lib/storage");
  const { enqueueJob, drainJobs } = await import("../src/lib/jobs");
  const { generatePlan } = await import("../src/lib/plans-ai");
  const { getPlanForCourse, materializePlan } = await import("../src/lib/plans");
  const { submitAttempt } = await import("../src/lib/exercises");
  const { createSessionSync } = await import("../src/lib/session");
  const { computeCourseProgress } = await import("../src/lib/progress");

  const db = getDb();
  const user = db.prepare("SELECT id, username FROM users WHERE username = ?").get("didioos") as
    | { id: number; username: string }
    | undefined;
  if (!user) throw new Error("Lancez d'abord npm run seed");

  const courseId = createCourse({
    userId: user.id,
    title: "Réseaux — test de bout en bout",
    domain: "reseau",
    level: "debutant",
    goal: "Vérifier le parcours complet : notes, plan, notion, exercice.",
  });

  const notes = `# Chapitre 1 — Modèle OSI

Le modèle OSI comporte sept couches : physique, liaison, réseau, transport, session, présentation, application.
La couche réseau (couche 3) utilise le protocole IP.

# Chapitre 2 — Adressage IPv4

Une adresse IPv4 fait 32 bits. Le masque /24 laisse 8 bits pour les hôtes.
Un sous-réseau /27 contient 32 adresses, soit 30 hôtes utilisables.

# Chapitre 3 — DHCP

DHCP attribue automatiquement une adresse IP selon le processus DORA : Discover, Offer, Request, Ack.
L'échec DHCP conduit souvent à une adresse 169.254.x.x (APIPA).`;

  const storagePath = saveText(user.id, "Notes de test réseau", notes);
  const doc = db
    .prepare(
      `INSERT INTO documents (user_id, course_id, kind, original_name, mime, size_bytes, storage_path, status)
       VALUES (?, ?, 'notes', 'Notes de test réseau', 'text/plain', ?, ?, 'pending')`,
    )
    .run(user.id, courseId, Buffer.byteLength(notes), storagePath);
  enqueueJob("extract_document", { documentId: Number(doc.lastInsertRowid) });
  await drainJobs(10);

  const docRow = db.prepare("SELECT status FROM documents WHERE id = ?").get(Number(doc.lastInsertRowid)) as { status: string };
  console.log(`Document: statut=${docRow.status}`);

  const planResult = await generatePlan({
    userId: user.id,
    courseId,
    title: "Réseaux — test",
    domain: "reseau",
    level: "debutant",
    goal: "Vérifier le parcours complet.",
  });
  const planRow = getPlanForCourse(courseId)!;
  materializePlan(courseId, planResult.planId, JSON.parse(planRow.content_json));

  const notion = db.prepare("SELECT id, title FROM notions WHERE course_id = ? ORDER BY ord LIMIT 1").get(courseId) as {
    id: number;
    title: string;
  };
  const ex = db.prepare("SELECT id FROM exercises WHERE notion_id = ? LIMIT 1").get(notion.id) as { id: number } | undefined;
  if (ex) {
    const answer = db.prepare("SELECT correct_json FROM exercises WHERE id = ?").get(ex.id) as { correct_json: string };
    const res = await submitAttempt({ userId: user.id, exerciseId: ex.id, answer: JSON.parse(answer.correct_json) as string });
    console.log(`Exercice: score=${res.result.score}/${res.result.maxScore}, corrigé=${res.result.graded}`);
  }

  const progress = computeCourseProgress(user.id, courseId);
  console.log(`Progression: avancement=${Math.round(progress.avancement * 100)}%, maîtrise=${Math.round(progress.maitrise * 100)}%`);

  const { token } = createSessionSync(user.id, "127.0.0.1", "smoke-test");
  console.log(`COURSE_ID=${courseId}`);
  console.log(`NOTION_ID=${notion.id}`);
  console.log(`SESSION_TOKEN=${token}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

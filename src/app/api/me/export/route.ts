import { getSessionUser } from "@/lib/session";
import { getDb } from "@/lib/db";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return new Response("Non autorisé", { status: 401 });
  const db = getDb();

  const profile = db
    .prepare("SELECT username, display_name, email, role, created_at, last_login_at FROM users WHERE id = ?")
    .get(user.id);
  const courses = db.prepare("SELECT * FROM courses WHERE user_id = ?").all(user.id);
  const documents = db
    .prepare("SELECT id, course_id, kind, original_name, size_bytes, page_count, status, created_at FROM documents WHERE user_id = ?")
    .all(user.id);
  const attempts = db
    .prepare(
      `SELECT ea.id, ea.exercise_id, ea.score, ea.max_score, ea.feedback, ea.ai_graded, ea.created_at
       FROM exercise_attempts ea WHERE ea.user_id = ?`,
    )
    .all(user.id);
  const messages = db
    .prepare(
      `SELECT cm.role, cm.content, cm.created_at FROM chat_messages cm
       JOIN chat_threads ct ON ct.id = cm.thread_id WHERE ct.user_id = ?`,
    )
    .all(user.id);
  const progress = db
    .prepare("SELECT notion_id, status, mastery_score, last_studied_at FROM notion_progress WHERE user_id = ?")
    .all(user.id);
  const notes = db.prepare("SELECT notion_id, content, updated_at FROM notion_notes WHERE user_id = ?").all(user.id);

  const payload = {
    exported_at: new Date().toISOString(),
    format_version: 1,
    profile,
    courses,
    documents,
    exercise_attempts: attempts,
    chat_messages: messages,
    notion_progress: progress,
    personal_notes: notes,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="kwiga-export-${user.username}.json"`,
      "cache-control": "private, no-store",
    },
  });
}

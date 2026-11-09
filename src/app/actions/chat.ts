"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getCourseForUser } from "@/lib/courses";
import { buildContext, getTutorReply, type TutorMode } from "@/lib/tutor";
import { BudgetError } from "@/lib/budget";
import { AiNotConfiguredError } from "@/lib/ai";
import { recordActivity, touchNotionStudy } from "@/lib/progress";

export type ChatResult = {
  ok: boolean;
  reply?: string;
  sources?: Array<{ documentId: number; documentName: string; pageNumber: number | null }>;
  configured?: boolean;
  error?: string;
};

function threadFor(userId: number, courseId: number, notionId: number | null): number {
  const db = getDb();
  const existing = db
    .prepare(
      `SELECT id FROM chat_threads WHERE user_id = ? AND course_id = ?
       AND (notion_id IS ?) ORDER BY id DESC LIMIT 1`,
    )
    .get(userId, courseId, notionId) as { id: number } | undefined;
  if (existing) return existing.id;
  const res = db
    .prepare("INSERT INTO chat_threads (user_id, course_id, notion_id, title) VALUES (?, ?, ?, ?)")
    .run(userId, courseId, notionId, "Tuteur");
  return Number(res.lastInsertRowid);
}

export async function sendMessageAction(input: {
  courseId: number;
  notionId: number | null;
  mode: TutorMode;
  message: string;
}): Promise<ChatResult> {
  const user = await requireUser();
  const course = getCourseForUser(input.courseId, user.id);
  if (!course) return { ok: false, error: "Parcours introuvable." };
  const message = input.message.trim().slice(0, 4000);
  if (!message) return { ok: false, error: "Message vide." };

  const db = getDb();
  const threadId = threadFor(user.id, input.courseId, input.notionId);
  db.prepare("INSERT INTO chat_messages (thread_id, role, content) VALUES (?, 'user', ?)").run(threadId, message);

  const history = (
    db
      .prepare(
        "SELECT role, content FROM chat_messages WHERE thread_id = ? ORDER BY id DESC LIMIT 12",
      )
      .all(threadId) as Array<{ role: "user" | "assistant"; content: string }>
  ).reverse();

  const context = buildContext({
    userId: user.id,
    courseId: input.courseId,
    notionId: input.notionId,
    question: message,
    history,
  });
  if (!context) return { ok: false, error: "Contexte introuvable." };

  try {
    const reply = await getTutorReply({
      userId: user.id,
      mode: input.mode,
      context,
      question: message,
    });
    db.prepare(
      "INSERT INTO chat_messages (thread_id, role, content, sources_json) VALUES (?, 'assistant', ?, ?)",
    ).run(threadId, reply.text, JSON.stringify(reply.sources));

    if (input.notionId) {
      touchNotionStudy(user.id, input.notionId);
      recordActivity({
        userId: user.id,
        courseId: input.courseId,
        notionId: input.notionId,
        type: "tuteur",
        label: `Échange avec le tuteur (${input.mode})`,
      });
    }
    revalidatePath(`/parcours/${input.courseId}/salle/${input.notionId ?? ""}`);
    return { ok: true, reply: reply.text, sources: reply.sources, configured: reply.configured };
  } catch (e) {
    const friendly =
      e instanceof AiNotConfiguredError
        ? e.message
        : e instanceof BudgetError
          ? e.message
          : "Le tuteur IA est momentanément indisponible. Réessayez plus tard.";
    db.prepare(
      "INSERT INTO chat_messages (thread_id, role, content) VALUES (?, 'assistant', ?)",
    ).run(threadId, `⚠️ ${friendly}`);
    return { ok: false, error: friendly };
  }
}

export async function getThreadMessages(courseId: number, notionId: number | null) {
  const user = await requireUser();
  const db = getDb();
  const thread = db
    .prepare(
      `SELECT id FROM chat_threads WHERE user_id = ? AND course_id = ? AND (notion_id IS ?)
       ORDER BY id DESC LIMIT 1`,
    )
    .get(user.id, courseId, notionId) as { id: number } | undefined;
  if (!thread) return [];
  return db
    .prepare("SELECT role, content, sources_json, created_at FROM chat_messages WHERE thread_id = ? ORDER BY id")
    .all(thread.id) as Array<{ role: string; content: string; sources_json: string | null; created_at: string }>;
}

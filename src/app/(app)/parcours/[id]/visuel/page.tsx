import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getDb } from "@/lib/db";
import { getCourseForUser } from "@/lib/courses";
import { imageConfigured } from "@/lib/config";
import { VisualCards, type VisualCard } from "@/components/VisualCards";

export const dynamic = "force-dynamic";
export const metadata = { title: "Révision visuelle — Kwiga" };

export default async function VisualPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/connexion");
  const courseId = Number((await params).id);
  const course = getCourseForUser(courseId, user.id);
  if (!course) notFound();

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT n.id, n.title, n.summary, n.explanation, np.status
       FROM notions n
       LEFT JOIN notion_progress np ON np.notion_id = n.id AND np.user_id = ?
       WHERE n.course_id = ? ORDER BY n.ord, n.id`,
    )
    .all(user.id, courseId) as Array<{
    id: number;
    title: string;
    summary: string | null;
    explanation: string | null;
    status: string | null;
  }>;

  const imageRows = db
    .prepare(
      `SELECT ni.notion_id, ni.id, ni.prompt FROM notion_images ni
       JOIN notions n ON n.id = ni.notion_id
       WHERE ni.user_id = ? AND n.course_id = ? ORDER BY ni.id DESC`,
    )
    .all(user.id, courseId) as Array<{ notion_id: number; id: number; prompt: string | null }>;

  const imagesByNotion = new Map<number, Array<{ id: number; url: string; prompt: string | null }>>();
  for (const img of imageRows) {
    const list = imagesByNotion.get(img.notion_id) ?? [];
    list.push({ id: img.id, url: `/api/images/${img.id}`, prompt: img.prompt });
    imagesByNotion.set(img.notion_id, list);
  }

  const cards: VisualCard[] = rows.map((r) => ({
    notionId: r.id,
    title: r.title,
    summary: r.summary ?? "",
    explanation: r.explanation ?? "",
    understood: r.status === "etudie" || r.status === "maitrise",
    images: imagesByNotion.get(r.id) ?? [],
  }));

  const firstNotUnderstood = cards.findIndex((c) => !c.understood);
  const initialIndex = firstNotUnderstood === -1 ? 0 : firstNotUnderstood;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/parcours/${courseId}`} className="text-sm text-ink-soft hover:text-ink">
            ← {String(course.title)}
          </Link>
          <h1 className="mt-2 font-display text-3xl text-ink">Révision visuelle</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Une carte par notion. Si le texte suffit, passez à la suivante. Sinon, composez une
            illustration.
          </p>
        </div>
      </div>

      <div className="mt-6">
        {cards.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink/20 bg-white/50 p-8 text-center text-sm text-ink-soft">
            Aucune notion dans ce parcours. Validez d&apos;abord un plan d&apos;apprentissage.
          </p>
        ) : (
          <VisualCards
            courseId={courseId}
            cards={cards}
            initialIndex={initialIndex}
            configured={imageConfigured()}
          />
        )}
      </div>
    </div>
  );
}

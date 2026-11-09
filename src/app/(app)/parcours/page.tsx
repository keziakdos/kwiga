import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getDb } from "@/lib/db";
import { getActiveCourseLimit, countActiveCourses } from "@/lib/courses";
import { computeCourseProgress } from "@/lib/progress";
import { archiveCourseAction, reactivateCourseAction } from "@/app/actions/courses";
import { Badge, EmptyState, ProgressBar, SectionTitle } from "@/components/ui";
import { domainLabel, levelLabel } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Parcours — Kwiga" };

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/connexion");
  const params = await searchParams;
  const db = getDb();
  const courses = db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM notions n WHERE n.course_id = c.id) AS notion_count,
        (SELECT COUNT(*) FROM documents d WHERE d.course_id = c.id) AS document_count
       FROM courses c WHERE c.user_id = ? ORDER BY
       CASE c.status WHEN 'active' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END, c.updated_at DESC`,
    )
    .all(user.id) as Array<Record<string, unknown>>;

  const active = courses.filter((c) => c.status !== "archived");
  const archived = courses.filter((c) => c.status === "archived");
  const limit = getActiveCourseLimit();
  const used = countActiveCourses(user.id);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-ink">Mes parcours</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {used} / {limit} parcours actifs. L&apos;archivage libère une place et conserve l&apos;historique.
          </p>
        </div>
        <Link href="/parcours/nouveau" className="btn-primary">
          + Nouveau parcours
        </Link>
      </div>

      {params.erreur ? (
        <p role="alert" className="rounded-xl bg-accent-coral/10 px-4 py-3 text-sm text-[#a33c22]">
          {params.erreur}
        </p>
      ) : null}

      <section>
        <SectionTitle>Actifs et brouillons</SectionTitle>
        {active.length === 0 ? (
          <EmptyState title="Aucun parcours actif">
            <p>Commencez par créer un parcours avec votre objectif et un document source.</p>
          </EmptyState>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {active.map((course) => {
              const progress = computeCourseProgress(user.id, Number(course.id));
              return (
                <article key={String(course.id)} className="card flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{domainLabel(String(course.domain))}</p>
                      <Link href={`/parcours/${course.id}`} className="mt-1 block font-display text-lg leading-snug text-ink hover:text-board-deep">
                        {String(course.title)}
                      </Link>
                    </div>
                    <Badge tone={course.status === "active" ? "green" : "yellow"}>
                      {course.status === "active" ? "Actif" : "Brouillon"}
                    </Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{String(course.goal)}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink-faint">
                    <span>{levelLabel(String(course.level))}</span>
                    <span>·</span>
                    <span>{String(course.notion_count)} notions</span>
                    <span>·</span>
                    <span>{String(course.document_count)} document(s)</span>
                  </div>
                  <div className="mt-4 space-y-2">
                    <ProgressBar value={progress.avancement} label="Avancement" />
                    <ProgressBar value={progress.maitrise} tone="yellow" label="Maîtrise" />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink/5 pt-4">
                    <Link href={`/parcours/${course.id}`} className="btn-ghost px-3 py-1.5 text-xs">
                      Ouvrir
                    </Link>
                    <form action={archiveCourseAction}>
                      <input type="hidden" name="course_id" value={String(course.id)} />
                      <button className="btn-ghost px-3 py-1.5 text-xs" type="submit">
                        Archiver
                      </button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {archived.length > 0 ? (
        <section>
          <SectionTitle>Archivés</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {archived.map((course) => (
              <article key={String(course.id)} className="card flex flex-col p-5 opacity-90">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/parcours/${course.id}`} className="font-display text-lg leading-snug text-ink hover:text-board-deep">
                    {String(course.title)}
                  </Link>
                  <Badge>Archivé</Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{String(course.goal)}</p>
                <div className="mt-4 flex items-center gap-2 border-t border-ink/5 pt-4">
                  <form action={reactivateCourseAction}>
                    <input type="hidden" name="course_id" value={String(course.id)} />
                    <button className="btn-ghost px-3 py-1.5 text-xs" type="submit">
                      Réactiver
                    </button>
                  </form>
                  <Link href={`/parcours/${course.id}`} className="btn-ghost px-3 py-1.5 text-xs">
                    Consulter
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

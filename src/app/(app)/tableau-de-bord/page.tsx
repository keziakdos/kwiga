import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { dashboardStats, computeCourseProgress } from "@/lib/progress";
import { getActiveCourseLimit } from "@/lib/courses";
import { Badge, EmptyState, ProgressBar, SectionTitle, StatCard } from "@/components/ui";
import { domainLabel, levelLabel, statusLabel } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tableau de bord — Kwiga" };

function formatDate(value: unknown): string {
  try {
    return new Date(String(value)).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/connexion");
  const stats = dashboardStats(user.id);
  const limit = getActiveCourseLimit();

  const activeCourses = stats.courses.filter((c) => c.status === "active" || c.status === "draft");
  const resumeCourse = activeCourses[0];
  const resumeNotion = resumeCourse?.current_notion_id ? Number(resumeCourse.current_notion_id) : null;

  return (
    <div className="space-y-8">
      <section className="board-surface relative overflow-hidden rounded-3xl px-6 py-8 shadow-card sm:px-9 sm:py-10">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent-yellow/10 blur-2xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Bonjour</p>
            <h1 className="mt-1 font-display text-3xl text-white sm:text-4xl">{user.display_name}</h1>
            <p className="mt-2 max-w-xl text-sm text-white/70">
              {activeCourses.length === 0
                ? "Créez votre premier parcours à partir d'un PDF ou de vos notes."
                : "Reprenez là où vous vous êtes arrêté, ou consultez votre progression."}
            </p>
          </div>
          {resumeCourse ? (
            <Link
              href={resumeNotion ? `/parcours/${resumeCourse.id}/salle/${resumeNotion}` : `/parcours/${resumeCourse.id}`}
              className="btn-accent shrink-0"
            >
              Reprendre mon apprentissage →
            </Link>
          ) : (
            <Link href="/parcours/nouveau" className="btn-accent shrink-0">
              Créer un parcours
            </Link>
          )}
        </div>
        <div className="relative mt-7 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/8 p-4">
            <p className="text-xs uppercase tracking-wide text-white/50">Avancement</p>
            <p className="mt-1 font-display text-2xl text-white">{Math.round(stats.global.avancement * 100)} %</p>
            <p className="text-xs text-white/50">activités terminées</p>
          </div>
          <div className="rounded-2xl bg-white/8 p-4">
            <p className="text-xs uppercase tracking-wide text-white/50">Maîtrise</p>
            <p className="mt-1 font-display text-2xl text-accent-yellow">{Math.round(stats.global.maitrise * 100)} %</p>
            <p className="text-xs text-white/50">notions évaluées et validées</p>
          </div>
          <div className="rounded-2xl bg-white/8 p-4">
            <p className="text-xs uppercase tracking-wide text-white/50">Parcours actifs</p>
            <p className="mt-1 font-display text-2xl text-white">
              {activeCourses.length} / {limit}
            </p>
            <p className="text-xs text-white/50">limite appliquée côté serveur</p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <StatCard label="Notions actives" value={String(stats.global.total)} hint={`${stats.global.engaged} travaillées`} />
        <StatCard label="Notions maîtrisées" value={String(stats.global.mastered)} hint="validées par évaluation" tone="yellow" />
        <StatCard label="Score moyen" value={`${Math.round(stats.global.avgScore * 100)} %`} hint={`${stats.global.attempts} tentatives`} tone="slate" />
      </div>

      <section>
        <SectionTitle
          action={
            <Link href="/parcours/nouveau" className="text-sm font-medium text-board-deep hover:underline">
              + Nouveau parcours
            </Link>
          }
        >
          Mes parcours
        </SectionTitle>
        {stats.courses.length === 0 ? (
          <EmptyState title="Aucun parcours pour le moment">
            <p>
              Créez un parcours en indiquant votre objectif, puis importez un PDF ou collez vos notes.
            </p>
            <Link href="/parcours/nouveau" className="btn-primary mt-4">
              Créer mon premier parcours
            </Link>
          </EmptyState>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {stats.courses.map((course) => {
              const progress = computeCourseProgress(user.id, Number(course.id));
              return (
                <Link
                  key={String(course.id)}
                  href={`/parcours/${course.id}`}
                  className="card group p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-board/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{domainLabel(String(course.domain))}</p>
                      <h3 className="mt-1 font-display text-lg leading-snug text-ink group-hover:text-board-deep">
                        {String(course.title)}
                      </h3>
                    </div>
                    <Badge tone={course.status === "archived" ? "neutral" : course.status === "active" ? "green" : "yellow"}>
                      {course.status === "active" ? "Actif" : course.status === "archived" ? "Archivé" : "Brouillon"}
                    </Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{String(course.goal)}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink-faint">
                    <span>{levelLabel(String(course.level))}</span>
                    <span>·</span>
                    <span>{String(course.notion_count)} notions</span>
                  </div>
                  <div className="mt-4 space-y-2">
                    <ProgressBar value={progress.avancement} label="Avancement" />
                    <ProgressBar value={progress.maitrise} tone="yellow" label="Maîtrise" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-6">
          <SectionTitle>À revoir</SectionTitle>
          {stats.toReview.length === 0 ? (
            <p className="text-sm text-ink-soft">Aucune notion à revoir pour l&apos;instant.</p>
          ) : (
            <ul className="space-y-2.5">
              {stats.toReview.map((n) => (
                <li key={String(n.id)}>
                  <Link
                    href={`/parcours/${n.course_id}/salle/${n.notion_id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white px-3.5 py-2.5 text-sm transition hover:border-accent-coral/40"
                  >
                    <span className="text-ink">{String(n.notion_title)}</span>
                    <Badge tone="coral">{statusLabel(String(n.status))}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-6">
          <SectionTitle>Prochaines révisions</SectionTitle>
          {stats.revisions.length === 0 ? (
            <p className="text-sm text-ink-soft">Aucune révision programmée.</p>
          ) : (
            <ul className="space-y-2.5">
              {stats.revisions.map((r) => (
                <li key={String(r.id)} className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white px-3.5 py-2.5 text-sm">
                  <div>
                    <p className="text-ink">{String(r.notion_title)}</p>
                    <p className="text-xs text-ink-faint">{String(r.course_title)}</p>
                  </div>
                  <span className="text-xs text-ink-faint">{formatDate(r.due_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card p-6">
        <SectionTitle>Activité récente</SectionTitle>
        {stats.activities.length === 0 ? (
          <p className="text-sm text-ink-soft">Votre historique apparaîtra ici.</p>
        ) : (
          <ul className="divide-y divide-ink/5">
            {stats.activities.map((a) => (
              <li key={String(a.id)} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="text-ink">{String(a.label)}</span>
                <span className="text-xs text-ink-faint">{formatDate(a.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

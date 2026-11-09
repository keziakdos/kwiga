import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getActiveCourseLimit, countActiveCourses } from "@/lib/courses";
import { NewCourseForm } from "@/components/NewCourseForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nouveau parcours — Kwiga" };

export default async function NewCoursePage() {
  const user = await getSessionUser();
  if (!user) redirect("/connexion");
  const limit = getActiveCourseLimit();
  const used = countActiveCourses(user.id);
  const full = used >= limit;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/parcours" className="text-sm text-ink-soft hover:text-ink">
        ← Mes parcours
      </Link>
      <h1 className="mt-4 font-display text-3xl text-ink">Nouveau parcours</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {used} / {limit} parcours actifs. Votre contenu guidera la construction du plan.
      </p>

      <div className="card mt-6 p-6 sm:p-8">
        {full ? (
          <div className="text-sm text-ink-soft">
            <p className="rounded-xl bg-accent-yellow/20 px-4 py-3 text-[#7a5b00]">
              Limite de {limit} parcours actifs atteinte. Archivez un parcours pour libérer une place.
            </p>
            <Link href="/parcours" className="btn-ghost mt-4">
              Gérer mes parcours
            </Link>
          </div>
        ) : (
          <NewCourseForm />
        )}
      </div>
    </div>
  );
}

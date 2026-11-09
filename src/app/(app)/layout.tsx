import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { logoutAction } from "@/app/actions/auth";
import { Logo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/connexion");
  if (user.must_change_password) redirect("/changer-mot-de-passe");

  return (
    <div className="paper-surface min-h-screen">
      <header className="sticky top-0 z-30 border-b border-paper-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-1 overflow-x-auto text-sm">
            <Link className="rounded-lg px-3 py-2 text-ink-soft transition hover:bg-ink/5 hover:text-ink" href="/tableau-de-bord">
              Tableau de bord
            </Link>
            <Link className="rounded-lg px-3 py-2 text-ink-soft transition hover:bg-ink/5 hover:text-ink" href="/parcours">
              Parcours
            </Link>
            {user.role === "admin" ? (
              <Link className="rounded-lg px-3 py-2 text-ink-soft transition hover:bg-ink/5 hover:text-ink" href="/admin">
                Administration
              </Link>
            ) : null}
            <Link className="rounded-lg px-3 py-2 text-ink-soft transition hover:bg-ink/5 hover:text-ink" href="/profil">
              Profil
            </Link>
            <form action={logoutAction}>
              <button className="rounded-lg px-3 py-2 text-ink-faint transition hover:bg-ink/5 hover:text-ink" type="submit">
                Déconnexion
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">{children}</main>
      <footer className="mx-auto max-w-7xl px-4 pb-8 text-xs text-ink-faint sm:px-6">
        Kwiga — outil pédagogique privé. Aucune certification officielle.{" "}
        <Link className="underline hover:text-ink" href="/mentions-legales">
          Mentions
        </Link>
        {" · "}
        <Link className="underline hover:text-ink" href="/confidentialite">
          Confidentialité
        </Link>
        {" · Aucune fonction audio."}
      </footer>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { Logo } from "@/components/ui";

export const dynamic = "force-dynamic";

const ADMIN_NAV = [
  { href: "/admin", label: "Vue d'ensemble" },
  { href: "/admin/utilisateurs", label: "Utilisateurs" },
  { href: "/admin/configuration", label: "Configuration" },
  { href: "/admin/statistiques", label: "Statistiques" },
  { href: "/admin/budget", label: "Budget & coûts IA" },
  { href: "/admin/erreurs", label: "Erreurs" },
  { href: "/admin/journal", label: "Journal admin" },
  { href: "/admin/documents-exemple", label: "Documents d'exemple" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/connexion");
  if (user.role !== "admin") redirect("/tableau-de-bord");

  return (
    <div className="paper-surface min-h-screen">
      <header className="sticky top-0 z-30 border-b border-paper-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="chip bg-slate-deep/10 text-slate-deep">Administration</span>
          </div>
          <Link href="/tableau-de-bord" className="text-sm text-ink-soft hover:text-ink">
            ← Espace apprenant
          </Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[220px_1fr]">
        <aside>
          <nav className="flex gap-1 overflow-x-auto lg:flex-col">
            {ADMIN_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-xl px-3.5 py-2 text-sm text-ink-soft transition hover:bg-ink/5 hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}

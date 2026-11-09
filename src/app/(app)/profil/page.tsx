import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getDb } from "@/lib/db";
import { ChangePasswordForm, ProfileForm } from "@/components/ProfileForms";
import { SectionTitle } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profil — Kwiga" };

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect("/connexion");
  const db = getDb();
  const row = db.prepare("SELECT email, created_at FROM users WHERE id = ?").get(user.id) as {
    email: string | null;
    created_at: string;
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Mon profil</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Identifiant : <strong>{user.username}</strong> · Rôle : {user.role === "admin" ? "Administrateur" : "Apprenant"}
        </p>
      </div>

      <section className="card p-6">
        <SectionTitle>Informations</SectionTitle>
        <ProfileForm displayName={user.display_name} email={row.email} />
      </section>

      <section className="card p-6">
        <SectionTitle>Mot de passe</SectionTitle>
        <ChangePasswordForm />
      </section>

      <section className="card p-6">
        <SectionTitle>Mes données</SectionTitle>
        <p className="text-sm text-ink-soft">
          Vous pouvez télécharger une copie de vos données (profil, parcours, documents — métadonnées —
          résultats et conversations). Les fichiers PDF ne sont pas inclus dans cet export.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="/api/me/export" className="btn-ghost px-3 py-1.5 text-xs">
            Télécharger mes données (JSON)
          </a>
          <Link href="/confidentialite" className="btn-ghost px-3 py-1.5 text-xs">
            Politique de confidentialité
          </Link>
        </div>
        <p className="mt-3 text-xs text-ink-faint">
          Pour la suppression définitive de votre compte et de vos données, contactez l&apos;administrateur.
        </p>
      </section>
    </div>
  );
}

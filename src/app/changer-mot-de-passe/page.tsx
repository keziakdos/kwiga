import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { ChangePasswordForm } from "@/components/ProfileForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Changement de mot de passe — Kwiga" };

export default async function ForcedChangePage() {
  const user = await getSessionUser();
  if (!user) redirect("/connexion");
  if (!user.must_change_password) redirect("/tableau-de-bord");

  return (
    <main className="paper-surface flex min-h-screen items-center justify-center px-6 py-12">
      <div className="card w-full max-w-lg p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-faint">Kwiga</p>
        <h1 className="mt-2 font-display text-2xl text-ink">Changement de mot de passe obligatoire</h1>
        <p className="mt-2 mb-5 text-sm text-ink-soft">
          Votre mot de passe est temporaire. Choisissez un nouveau mot de passe personnel avant de
          continuer.
        </p>
        <ForcedChangeForm />
        <p className="mt-4 text-xs text-ink-faint">
          Connecté en tant que <strong>{user.username}</strong>.
        </p>
      </div>
    </main>
  );
}

function ForcedChangeForm() {
  return <ChangePasswordForm forced />;
}

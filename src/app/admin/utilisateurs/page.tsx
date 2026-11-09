import { getDb } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { CreateUserForm, ResetPasswordButton } from "@/components/admin/AdminForms";
import { setUserStatusAction, setUserRoleAction, deleteUserAction } from "@/app/actions/admin";
import { Badge, SectionTitle } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Utilisateurs — Administration" };

export default async function AdminUsersPage() {
  const admin = await getSessionUser();
  if (!admin || admin.role !== "admin") redirect("/connexion");

  const db = getDb();
  const users = db
    .prepare(
      `SELECT u.*, (SELECT COUNT(*) FROM courses c WHERE c.user_id = u.id AND c.status != 'archived') AS course_count
       FROM users u ORDER BY u.role DESC, u.created_at ASC`,
    )
    .all() as Array<Record<string, unknown>>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Utilisateurs</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Création réservée à l&apos;administrateur. Aucune inscription publique. Aucun contenu privé n&apos;est consultable ici.
        </p>
      </div>

      <section className="card p-6">
        <SectionTitle>Créer un compte</SectionTitle>
        <CreateUserForm />
      </section>

      <section className="card p-6">
        <SectionTitle>Comptes existants</SectionTitle>
        <div className="space-y-3">
          {users.map((u) => {
            const isSelf = Number(u.id) === admin.id;
            return (
              <div key={String(u.id)} className="rounded-xl border border-ink/10 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink">
                      {String(u.display_name)} <span className="text-xs text-ink-faint">({String(u.username)})</span>
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                      <Badge tone={u.role === "admin" ? "slate" : "green"}>{u.role === "admin" ? "Administrateur" : "Apprenant"}</Badge>
                      <Badge tone={u.status === "active" ? "green" : "coral"}>{u.status === "active" ? "Actif" : "Suspendu"}</Badge>
                      {Number(u.must_change_password) ? <Badge tone="yellow">Mot de passe à changer</Badge> : null}
                      <Badge>{String(u.course_count)} parcours</Badge>
                    </div>
                    <p className="mt-1 text-xs text-ink-faint">
                      Créé le {new Date(String(u.created_at)).toLocaleDateString("fr-FR")}
                      {u.last_login_at ? ` · dernière connexion ${new Date(String(u.last_login_at)).toLocaleDateString("fr-FR")}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ResetPasswordButton userId={Number(u.id)} username={String(u.username)} />
                    {!isSelf ? (
                      <>
                        <form action={setUserStatusAction}>
                          <input type="hidden" name="user_id" value={String(u.id)} />
                          <input type="hidden" name="status" value={u.status === "active" ? "suspended" : "active"} />
                          <button type="submit" className="btn-ghost px-2.5 py-1 text-xs">
                            {u.status === "active" ? "Suspendre" : "Réactiver"}
                          </button>
                        </form>
                        <form action={setUserRoleAction}>
                          <input type="hidden" name="user_id" value={String(u.id)} />
                          <input type="hidden" name="role" value={u.role === "admin" ? "learner" : "admin"} />
                          <button type="submit" className="btn-ghost px-2.5 py-1 text-xs">
                            {u.role === "admin" ? "Rendre apprenant" : "Rendre admin"}
                          </button>
                        </form>
                      </>
                    ) : (
                      <span className="text-xs text-ink-faint">Compte courant</span>
                    )}
                  </div>
                </div>
                {!isSelf ? (
                  <details className="mt-2 text-xs text-ink-faint">
                    <summary className="cursor-pointer text-[#a33c22]">Supprimer ce compte</summary>
                    <form action={deleteUserAction} className="mt-2 flex flex-wrap items-center gap-2">
                      <input type="hidden" name="user_id" value={String(u.id)} />
                      <input name="confirm" className="field max-w-xs" placeholder={`Tapez ${String(u.username)}`} required />
                      <button type="submit" className="btn bg-[#a33c22] px-2.5 py-1 text-xs text-white hover:brightness-95">
                        Supprimer définitivement
                      </button>
                    </form>
                  </details>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

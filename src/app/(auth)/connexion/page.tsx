import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/tableau-de-bord");

  return (
    <main className="min-h-screen lg:grid lg:grid-cols-[1.1fr_1fr]">
      <section className="board-surface relative flex min-h-[42vh] flex-col justify-between overflow-hidden p-8 sm:p-12 lg:min-h-screen lg:p-16">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent-yellow/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-accent-coral/10 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-yellow font-display text-2xl font-bold text-slate-deep">
              K
            </span>
            <div>
              <p className="font-display text-2xl tracking-tight text-white">Kwiga</p>
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Ma salle de classe</p>
            </div>
          </div>
        </div>

        <div className="relative mt-12 max-w-xl">
          <h1 className="font-display text-3xl leading-tight text-white sm:text-4xl lg:text-5xl">
            Apprenez les réseaux à partir de <span className="text-accent-yellow">vos propres documents</span>.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-white/70">
            Importez un PDF ou collez vos notes. Kwiga construit un parcours structuré, vous guide
            notion par notion et vérifie votre compréhension — par écrit, avec un tuteur IA.
          </p>
          <ul className="mt-8 grid gap-3 text-sm text-white/70 sm:grid-cols-2">
            {[
              "Plan de parcours modifiable",
              "Explications et schémas réseau",
              "Quiz et exercices corrigés",
              "Progression et révisions",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 rounded-xl bg-white/5 px-3.5 py-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-yellow" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative mt-12 text-xs leading-relaxed text-white/40">
          Aucune fonction audio. Évaluations pédagogiques indicatives, sans certification officielle.
        </p>
      </section>

      <section className="paper-surface flex min-h-[58vh] items-center justify-center p-6 sm:p-10 lg:min-h-screen">
        <div className="w-full max-w-md animate-fade-up">
          <div className="card p-7 sm:p-9">
            <h2 className="font-display text-2xl text-ink">Connexion</h2>
            <p className="mt-1.5 mb-6 text-sm text-ink-soft">
              Entrez votre identifiant et votre mot de passe pour reprendre votre apprentissage.
            </p>
            <LoginForm />
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-ink-faint">
            <Link className="hover:text-ink" href="/mot-de-passe-oublie">
              Mot de passe oublié ?
            </Link>
            <Link className="hover:text-ink" href="/mentions-legales">
              Mentions légales
            </Link>
            <Link className="hover:text-ink" href="/confidentialite">
              Confidentialité
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

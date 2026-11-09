import Link from "next/link";
import { legal, isLegalConfigured } from "@/lib/legal";

export const metadata = { title: "Mentions légales — Kwiga" };

export default function MentionsLegalesPage() {
  const configured = isLegalConfigured();
  return (
    <main className="paper-surface min-h-screen px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/connexion" className="text-sm text-ink-soft hover:text-ink">
          ← Retour à la connexion
        </Link>
        <h1 className="mt-6 font-display text-3xl text-ink">Mentions légales</h1>

        {!configured ? (
          <p className="mt-5 rounded-xl border border-accent-yellow/60 bg-accent-yellow/15 px-4 py-3 text-sm text-[#7a5b00]">
            Information à compléter par l&apos;administrateur : le nom de l&apos;éditeur et un contact
            n&apos;ont pas encore été renseignés (variables <code>LEGAL_EDITOR_NAME</code> et{" "}
            <code>LEGAL_CONTACT_EMAIL</code>).
          </p>
        ) : null}

        <div className="mt-6 space-y-6 text-sm leading-relaxed text-ink-soft">
          <section>
            <h2 className="font-display text-lg text-ink">Éditeur</h2>
            <p className="mt-2">
              {configured
                ? `${legal.editorName}${legal.editorRole ? ` — ${legal.editorRole}` : ""}`
                : "Non renseigné."}
              {legal.country ? `, ${legal.country}` : ""}
            </p>
            <p className="mt-1">
              Contact :{" "}
              {legal.contactEmail ? (
                <a className="underline hover:text-ink" href={`mailto:${legal.contactEmail}`}>
                  {legal.contactEmail}
                </a>
              ) : (
                "non renseigné"
              )}
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg text-ink">Hébergement</h2>
            <p className="mt-2">{legal.hosting || "Hébergement non renseigné."}</p>
          </section>

          <section>
            <h2 className="font-display text-lg text-ink">Nature du service</h2>
            <p className="mt-2">
              Kwiga est un outil pédagogique privé d&apos;aide à l&apos;apprentissage. Il ne constitue
              pas une formation officielle, ni une certification Cisco ou d&apos;un autre organisme.
              Les évaluations produites par l&apos;IA sont indicatives.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg text-ink">Accès</h2>
            <p className="mt-2">
              L&apos;accès est gratuit et réservé aux comptes créés par l&apos;administrateur. Aucune
              inscription publique n&apos;est ouverte.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg text-ink">Propriété intellectuelle</h2>
            <p className="mt-2">
              Les documents importés restent la propriété de leur auteur. L&apos;utilisateur garantit
              détenir les droits nécessaires sur les documents qu&apos;il importe.
            </p>
          </section>
        </div>

        <div className="mt-10 flex gap-5 text-xs text-ink-faint">
          <Link className="hover:text-ink" href="/confidentialite">
            Politique de confidentialité
          </Link>
          <Link className="hover:text-ink" href="/connexion">
            Connexion
          </Link>
        </div>
      </div>
    </main>
  );
}

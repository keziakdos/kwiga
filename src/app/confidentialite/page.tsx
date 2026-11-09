import Link from "next/link";
import { legal } from "@/lib/legal";

export const dynamic = "force-dynamic";
export const metadata = { title: "Confidentialité — Kwiga" };

export default function ConfidentialitePage() {
  return (
    <main className="paper-surface min-h-screen px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/connexion" className="text-sm text-ink-soft hover:text-ink">
          ← Retour à la connexion
        </Link>
        <h1 className="mt-6 font-display text-3xl text-ink">Politique de confidentialité</h1>

        <div className="mt-6 space-y-6 text-sm leading-relaxed text-ink-soft">
          <section>
            <h2 className="font-display text-lg text-ink">Données conservées</h2>
            <p className="mt-2">
              Identifiant, nom affiché, adresse e-mail facultative, mot de passe haché (Argon2id),
              documents importés, conversations avec le tuteur, résultats d&apos;exercices et
              progression. Les sessions sont stockées côté serveur sous forme de jetons hachés.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg text-ink">Cloisonnement</h2>
            <p className="mt-2">
              Vos documents, conversations et résultats sont strictement privés. Un autre apprenant ne
              peut y accéder. L&apos;administrateur ne consulte pas ces contenus par défaut ; tout accès
              justifié est journalisé.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg text-ink">Traitement par l&apos;IA</h2>
            <p className="mt-2">
              Lorsque le tuteur IA est configuré, seuls les extraits pertinents de vos documents sont
              transmis au fournisseur d&apos;IA, jamais le document entier. Le fournisseur peut
              appliquer ses propres conditions de conservation ; celles-ci sont indiquées par
              l&apos;administrateur. Quand l&apos;IA n&apos;est pas configurée, aucune donnée n&apos;est
              transmise.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg text-ink">Durée et suppression</h2>
            <p className="mt-2">
              Les données sont conservées tant que le compte existe. Vous pouvez demander l&apos;export
              ou la suppression de vos données à l&apos;administrateur. La suppression d&apos;un compte
              supprime ses parcours, documents, conversations et résultats.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg text-ink">Cookies</h2>
            <p className="mt-2">
              Un unique cookie de session est utilisé (httpOnly, SameSite=Lax) pour maintenir votre
              connexion. Aucun cookie publicitaire ni traceur tiers n&apos;est installé.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg text-ink">Contact</h2>
            <p className="mt-2">
              {legal.contactEmail ? (
                <a className="underline hover:text-ink" href={`mailto:${legal.contactEmail}`}>
                  {legal.contactEmail}
                </a>
              ) : (
                "Contact à compléter par l'administrateur (LEGAL_CONTACT_EMAIL)."
              )}
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

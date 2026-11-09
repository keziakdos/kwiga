import Link from "next/link";

export const metadata = { title: "Mot de passe oublié — Kwiga" };

export default function MotDePasseOubliePage() {
  return (
    <main className="paper-surface flex min-h-screen items-center justify-center px-6 py-12">
      <div className="card w-full max-w-lg p-8">
        <Link href="/connexion" className="text-sm text-ink-soft hover:text-ink">
          ← Retour à la connexion
        </Link>
        <h1 className="mt-5 font-display text-2xl text-ink">Mot de passe oublié</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Kwiga n&apos;envoie pas d&apos;e-mail automatique. La réinitialisation est effectuée par
          l&apos;administrateur, qui génère un mot de passe temporaire à changer dès la première
          connexion.
        </p>
        <div className="mt-5 rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink-soft">
          Contactez l&apos;administrateur de votre espace Kwiga en précisant votre identifiant.
          Vérifiez votre identité selon la procédure convenue. Ne communiquez jamais votre ancien mot
          de passe.
        </div>
        <p className="mt-5 text-xs text-ink-faint">
          Pour des raisons de sécurité, aucune information ne confirme ici l&apos;existence d&apos;un
          compte.
        </p>
      </div>
    </main>
  );
}

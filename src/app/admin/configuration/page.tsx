import { getDb } from "@/lib/db";
import { config } from "@/lib/config";
import { ConfigForm } from "@/components/admin/BudgetForms";
import { SectionTitle } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Configuration — Administration" };

function setting(key: string, fallback: number): number {
  const row = getDb().prepare("SELECT value FROM app_settings WHERE key = ?").get(key) as { value: string } | undefined;
  const n = row ? Number.parseInt(row.value, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export default function AdminConfigPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-ink">Configuration</h1>
        <p className="mt-1 text-sm text-ink-soft">Limites appliquées côté serveur. Les valeurs d&apos;environnement servent de défaut.</p>
      </div>

      <section className="card p-6">
        <SectionTitle>Limites d&apos;usage</SectionTitle>
        <ConfigForm
          maxActiveCourses={setting("max_active_courses", config.limits.maxActiveCourses)}
          maxUploads={setting("max_uploads", config.limits.maxUploadsPerUser)}
          maxPdfMb={setting("max_pdf_mb", config.limits.maxPdfMb)}
          maxPdfPages={setting("max_pdf_pages", config.limits.maxPdfPages)}
        />
      </section>

      <section className="card p-6">
        <SectionTitle>Variables d&apos;environnement (lecture seule)</SectionTitle>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {[
            ["APP_URL", config.appUrl],
            ["Fournisseur IA", config.ai.provider],
            ["Modèle IA", config.ai.model || "non défini"],
            ["Clé IA", config.ai.apiKey ? "définie (non affichée)" : "non définie"],
            ["Budget tokens entrée", String(config.ai.maxInputTokens)],
            ["Budget tokens sortie", String(config.ai.maxOutputTokens)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 rounded-lg bg-white px-3 py-2">
              <dt className="text-ink-faint">{k}</dt>
              <dd className="text-right font-medium text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-ink-faint">
          La clé API n&apos;est jamais affichée. Modifiez-la dans le fichier <code>.env</code> puis redémarrez le service.
        </p>
      </section>
    </div>
  );
}

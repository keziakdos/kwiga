import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getDb } from "@/lib/db";
import { getCourseForUser } from "@/lib/courses";
import { getSavedFiche } from "@/lib/fiche";
import { Diagram } from "@/components/Diagram";
import { PrintButton } from "@/components/PrintButton";
import { CheckQuestions } from "@/components/CheckQuestions";
import { NetworkAnimation } from "@/components/NetworkAnimation";
import { ImageGallery } from "@/components/ImageGallery";
import { ZoomableImage } from "@/components/ZoomableImage";
import { SchemaPrompt } from "@/components/SchemaPrompt";
import { listNotionImages } from "@/lib/images";
import { config, imageConfigured } from "@/lib/config";
import { generateFicheAction } from "@/app/actions/fiche";

export const dynamic = "force-dynamic";

export default async function FichePage({ params }: { params: Promise<{ id: string; notionId: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/connexion");
  const { id, notionId } = await params;
  const courseId = Number(id);
  const nId = Number(notionId);
  const course = getCourseForUser(courseId, user.id);
  if (!course) notFound();

  const db = getDb();
  const notion = db
    .prepare("SELECT * FROM notions WHERE id = ? AND course_id = ?")
    .get(nId, courseId) as Record<string, unknown> | undefined;
  if (!notion) notFound();

  const saved = getSavedFiche(user.id, nId);
  const images = saved ? listNotionImages(user.id, nId) : [];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/parcours/${courseId}/salle/${nId}`} className="text-sm text-ink-soft hover:text-ink">
          ← Retour à la notion
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <form action={generateFicheAction}>
            <input type="hidden" name="course_id" value={courseId} />
            <input type="hidden" name="notion_id" value={nId} />
            <input type="hidden" name="variant" value="standard" />
            <button type="submit" className="btn-ghost px-3 py-1.5 text-xs">Régénérer</button>
          </form>
          <form action={generateFicheAction}>
            <input type="hidden" name="course_id" value={courseId} />
            <input type="hidden" name="notion_id" value={nId} />
            <input type="hidden" name="variant" value="analogie" />
            <button type="submit" className="btn-ghost px-3 py-1.5 text-xs">Nouvelle explication</button>
          </form>
          <a href={`/api/fiches/${nId}/download`} className="btn-ghost px-3 py-1.5 text-xs">
            Télécharger la fiche
          </a>
          <PrintButton />
        </div>
      </div>

      {!saved ? (
        <div className="paper-surface rounded-3xl border border-paper-line p-8 shadow-card">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-faint">Fiche visuelle — {String(course.title)}</p>
          <h1 className="mt-2 font-display text-3xl text-ink">{String(notion.title)}</h1>
          {notion.summary ? <p className="mt-4 text-sm leading-relaxed text-ink-soft">{String(notion.summary)}</p> : null}
          {notion.explanation ? (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{String(notion.explanation)}</p>
          ) : null}
          <p className="mt-5 rounded-xl bg-accent-yellow/15 px-4 py-3 text-sm text-[#7a5b00]">
            Aucune fiche enregistrée pour cette notion. Générez-la une première fois : elle sera conservée
            pour ne pas être recréée à chaque visite.
          </p>
          <form action={generateFicheAction} className="mt-4">
            <input type="hidden" name="course_id" value={courseId} />
            <input type="hidden" name="notion_id" value={nId} />
            <input type="hidden" name="variant" value="standard" />
            <button type="submit" className="btn-primary">Générer la fiche visuelle</button>
          </form>
        </div>
      ) : (
        <FicheView
          content={saved.content}
          updatedAt={saved.updatedAt}
          courseTitle={String(course.title)}
          courseId={courseId}
          notionId={nId}
          domain={String(course.domain)}
          images={images}
          imageConfigured={imageConfigured()}
          maxImages={config.images.maxPerNotion}
        />
      )}
    </div>
  );
}

function FicheView({
  content,
  updatedAt,
  courseTitle,
  courseId,
  notionId,
  domain,
  images,
  imageConfigured: imagesConfigured,
  maxImages,
}: {
  content: import("@/lib/fiche").FicheContent;
  updatedAt: string;
  courseTitle: string;
  courseId: number;
  notionId: number;
  domain: string;
  images: import("@/components/ImageGallery").ImageItem[];
  imageConfigured: boolean;
  maxImages: number;
}) {
  return (
    <article className="paper-surface rounded-3xl border border-paper-line p-8 shadow-card print:border-0 print:shadow-none">
      <p className="text-xs uppercase tracking-[0.2em] text-ink-faint">Fiche visuelle — {courseTitle}</p>
      <h1 className="mt-2 font-display text-3xl text-ink">{content.title}</h1>
      <p className="mt-1 text-xs text-ink-faint">
        {content.aiGenerated ? "Enrichie par l'IA à partir de vos documents" : "Construite à partir du plan"} ·
        mise à jour le {new Date(updatedAt).toLocaleString("fr-FR")}
      </p>

      {content.notice ? (
        <p className="mt-3 rounded-xl bg-accent-yellow/15 px-3.5 py-2.5 text-xs leading-relaxed text-[#7a5b00]">
          {content.notice}
        </p>
      ) : null}

      {content.intro ? (
        <section className="mt-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-board-deep">Idée principale</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{content.intro}</p>
        </section>
      ) : null}

      {content.keyPoints.length > 0 ? (
        <section className="mt-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-board-deep">Points clés</h2>
          <ul className="mt-1.5 space-y-1.5 text-sm leading-relaxed text-ink-soft">
            {content.keyPoints.map((p, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-yellow" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {content.steps.length > 0 ? (
        <section className="mt-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-board-deep">Démarche pas à pas</h2>
          <ol className="mt-1.5 list-inside list-decimal space-y-1 text-sm leading-relaxed text-ink-soft">
            {content.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </section>
      ) : null}

      {content.diagram ? (
        <section className="mt-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-board-deep">Schéma explicatif</h2>
          <div className="mt-2">
            <Diagram code={content.diagram} />
          </div>
        </section>
      ) : null}

      {domain === "reseau" ? (
        <section className="mt-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-board-deep">Schéma animé</h2>
          {(() => {
            const figure = content.sources.find((s) => s.pageNumber);
            if (!figure) return null;
            return (
              <div className="mt-2 space-y-2">
                <ZoomableImage
                  src={`/api/documents/${figure.documentId}/page-image?page=${figure.pageNumber}`}
                  alt={`Figure du chapitre — ${figure.documentName}, page ${figure.pageNumber}`}
                  caption={`Figure du chapitre : ${figure.documentName}, page ${figure.pageNumber}`}
                  className="max-h-80"
                />
                <p className="text-xs text-ink-faint">
                  Le schéma animé ci-dessous explique le mécanisme de cette figure du document.
                </p>
              </div>
            );
          })()}
          <div className="mt-2">
            <NetworkAnimation
              title={content.title}
              context={[content.intro, ...content.keyPoints, content.example].filter(Boolean).join(" ")}
            />
          </div>
          <SchemaPrompt
            title={content.title}
            context={[content.intro, ...content.keyPoints, content.example].filter(Boolean).join(" ")}
            courseId={courseId}
            notionId={notionId}
            configured={imagesConfigured}
          />
        </section>
      ) : null}

      <ImageGallery
        courseId={courseId}
        notionId={notionId}
        images={images}
        configured={imagesConfigured}
        maxPerNotion={maxImages}
      />

      {content.example ? (
        <section className="mt-4 rounded-xl border border-accent-coral/30 bg-white/70 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[#a33c22]">Exemple</h2>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{content.example}</p>
        </section>
      ) : null}

      {(() => {
        const items =
          content.checkItems && content.checkItems.length > 0
            ? content.checkItems
            : content.checkQuestions.map((q) => ({ question: q, answer: "" }));
        if (items.length === 0) return null;
        return (
          <section className="mt-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-board-deep">
              Vérifier sa compréhension
            </h2>
            <p className="mt-1 text-xs text-ink-faint">Cliquez sur une question pour afficher la réponse.</p>
            <CheckQuestions items={items} />
          </section>
        );
      })()}

      {content.sources.length > 0 ? (
        <section className="mt-6 border-t border-paper-line pt-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Pages du document</h2>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {content.sources.map((s) => (
              <div key={`${s.documentId}-${s.pageNumber ?? "s"}`} className="overflow-hidden rounded-xl border border-paper-line bg-white">
                {s.pageNumber ? (
                  <Link href={`/parcours/${courseId}/documents/${s.documentId}?page=${s.pageNumber}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/documents/${s.documentId}/page-image?page=${s.pageNumber}`}
                      alt={`${s.documentName} — page ${s.pageNumber}`}
                      className="h-48 w-full object-cover object-top"
                      loading="lazy"
                    />
                  </Link>
                ) : null}
                <div className="px-3 py-2 text-xs text-ink-soft">
                  {s.documentName}
                  {s.pageNumber ? ` — page ${s.pageNumber}` : " (section de notes)"}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <p className="mt-6 border-t border-paper-line pt-4 text-[11px] leading-relaxed text-ink-faint">
        Fiche pédagogique générée à partir de vos documents. Kwiga n&apos;est pas une certification
        officielle ; vérifiez les points importants dans le document source.
      </p>
    </article>
  );
}

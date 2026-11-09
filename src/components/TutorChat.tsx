"use client";

import { useRef, useState } from "react";
import { sendMessageAction } from "@/app/actions/chat";
import type { TutorMode } from "@/lib/tutor";

type Msg = { role: "user" | "assistant"; content: string; sources?: Array<{ documentName: string; pageNumber: number | null }> };

const SHORTCUTS: Array<{ label: string; mode: TutorMode; message: string }> = [
  { label: "Je n'ai pas compris", mode: "plus_simple", message: "Je n'ai pas compris cette notion. Peux-tu me l'expliquer autrement ?" },
  { label: "Explique plus simplement", mode: "plus_simple", message: "Explique-moi cette notion plus simplement, avec des phrases courtes." },
  { label: "Donne un exemple concret", mode: "exemple", message: "Donne-moi un exemple concret de cette notion." },
  { label: "Chemin d'un paquet", mode: "libre", message: "Montre-moi le chemin d'un paquet dans ce réseau, étape par étape." },
  { label: "Propose un exercice", mode: "exercice", message: "Propose-moi un exercice adapté à mon niveau." },
  { label: "Vérifie mon raisonnement", mode: "verifie_raisonnement", message: "Vérifie mon raisonnement sur cette notion." },
];

export function TutorChat({
  courseId,
  notionId,
  initialMessages,
  configured,
}: {
  courseId: number;
  notionId: number | null;
  initialMessages: Msg[];
  configured: boolean;
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<TutorMode>("libre");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  async function send(text: string, sendMode: TutorMode) {
    const message = text.trim();
    if (!message || busy) return;
    setBusy(true);
    setError(null);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    try {
      const result = await sendMessageAction({ courseId, notionId, mode: sendMode, message });
      if (result.reply) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: result.reply as string, sources: result.sources },
        ]);
      } else {
        setError(result.error ?? "Le tuteur n'a pas pu répondre.");
      }
    } catch {
      setError("Erreur de communication avec le tuteur.");
    } finally {
      setBusy(false);
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      });
    }
  }

  return (
    <div className="card flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-ink">Tuteur Kwiga</h2>
          <p className="text-xs text-ink-faint">Écrit uniquement · aucune fonction audio</p>
        </div>
        <span className={`chip ${configured ? "bg-board/10 text-board-deep" : "bg-accent-yellow/25 text-[#7a5b00]"}`}>
          {configured ? "IA configurée" : "IA non configurée"}
        </span>
      </div>

      {!configured ? (
        <p className="mt-3 rounded-xl bg-accent-yellow/15 px-3.5 py-2.5 text-xs leading-relaxed text-[#7a5b00]">
          Le tuteur IA n&apos;est pas configuré par l&apos;administrateur. Vous pouvez toujours consulter
          le cours, vos références et votre progression. Les réponses ci-dessous resteront limitées tant
          qu&apos;aucun fournisseur n&apos;est renseigné.
        </p>
      ) : null}

      <div ref={listRef} className="mt-4 max-h-[26rem] space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Posez une question ou utilisez un raccourci ci-dessous. Le tuteur connaît votre parcours,
            la notion affichée et vos documents.
          </p>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "ml-6 bg-board text-white"
                  : "mr-4 border border-ink/10 bg-white text-ink"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.sources && m.sources.length > 0 ? (
                <div className="mt-2 border-t border-ink/10 pt-2 text-xs text-ink-faint">
                  Références : {m.sources.map((s) => `${s.documentName}${s.pageNumber ? ` p.${s.pageNumber}` : ""}`).join(" · ")}
                </div>
              ) : null}
            </div>
          ))
        )}
        {busy ? (
          <div className="mr-4 inline-flex items-center gap-2 rounded-2xl border border-ink/10 bg-white px-3.5 py-2.5 text-sm text-ink-faint">
            <span className="h-2 w-2 animate-pulse rounded-full bg-board-soft" />
            Le tuteur réfléchit…
          </div>
        ) : null}
      </div>

      {error ? <p role="alert" className="mt-2 text-xs text-[#a33c22]">{error}</p> : null}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {SHORTCUTS.map((s) => (
          <button
            key={s.label}
            type="button"
            disabled={busy}
            onClick={() => send(s.message, s.mode)}
            className="rounded-full border border-ink/15 bg-white px-2.5 py-1 text-xs text-ink-soft transition hover:border-board/40 hover:text-ink disabled:opacity-50"
          >
            {s.label}
          </button>
        ))}
        <button
          type="button"
          disabled={busy}
          onClick={() => setMode(mode === "a_vous_expliquer" ? "libre" : "a_vous_expliquer")}
          className={`rounded-full px-2.5 py-1 text-xs transition ${
            mode === "a_vous_expliquer" ? "bg-accent-yellow text-slate-deep" : "border border-ink/15 bg-white text-ink-soft hover:text-ink"
          }`}
        >
          {mode === "a_vous_expliquer" ? "Mode : à vous d'expliquer" : "À vous d'expliquer"}
        </button>
      </div>

      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input, mode);
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input, mode);
            }
          }}
          rows={2}
          maxLength={4000}
          placeholder={mode === "a_vous_expliquer" ? "Expliquez la notion avec vos propres mots…" : "Écrivez votre question…"}
          className="field min-h-[52px] flex-1 resize-y"
        />
        <button type="submit" className="btn-primary" disabled={busy || !input.trim()}>
          Envoyer
        </button>
      </form>
      <p className="mt-1.5 text-[11px] text-ink-faint">
        Les réponses distinguent le document et les compléments généraux. Aide pédagogique, sans
        certification.
      </p>
    </div>
  );
}

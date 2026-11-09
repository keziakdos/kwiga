"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cleanMermaid } from "@/lib/mermaid";

export function Diagram({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [status, setStatus] = useState<"pending" | "ok" | "invalid">("pending");
  const [raw, setRaw] = useState(code);

  useEffect(() => {
    let cancelled = false;
    setRaw(code);
    const cleaned = cleanMermaid(code);
    if (!cleaned) {
      setStatus("invalid");
      return;
    }
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "neutral",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          suppressErrorRendering: true,
        } as Parameters<typeof mermaid.initialize>[0]);
        await mermaid.parse(cleaned);
        const { svg } = await mermaid.render(`mermaid-${id}`, cleaned);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          setStatus("ok");
        }
      } catch {
        if (!cancelled) {
          if (ref.current) ref.current.innerHTML = "";
          setStatus("invalid");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, id]);

  if (status === "invalid") {
    return (
      <div className="rounded-xl border border-accent-coral/40 bg-white p-4 text-sm text-ink-soft">
        <p className="font-medium text-ink">Schéma indisponible</p>
        <p className="mt-1 text-xs leading-relaxed">
          Le code du schéma n&apos;est pas un Mermaid valide, donc il ne peut pas être affiché. Le cours
          reste utilisable ; régénérez la fiche (ou le plan) pour obtenir un schéma corrigé.
        </p>
        <details className="mt-2 text-xs text-ink-faint">
          <summary className="cursor-pointer">Voir le code reçu</summary>
          <pre className="mt-1 overflow-x-auto rounded-lg bg-ink/5 p-2 text-[11px]">{raw}</pre>
        </details>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`diagram rounded-xl border border-ink/10 bg-white p-4 [&_svg]:mx-auto [&_svg]:max-w-full ${status === "pending" ? "min-h-[70px] animate-pulse" : ""}`}
      aria-label="Schéma technique"
    />
  );
}

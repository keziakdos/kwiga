"use client";

import { useEffect, useId, useRef, useState } from "react";

export function Diagram({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "neutral",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        });
        const { svg } = await mermaid.render(`mermaid-${id}`, code);
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, id]);

  if (error) {
    return (
      <div className="rounded-xl border border-ink/10 bg-white p-4 text-sm text-ink-soft">
        Le schéma n&apos;a pas pu être rendu. Contenu brut :
        <pre className="mt-2 overflow-x-auto text-xs text-ink-faint">{code}</pre>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="diagram rounded-xl border border-ink/10 bg-white p-4 [&_svg]:mx-auto [&_svg]:max-w-full"
      aria-label="Schéma technique"
    />
  );
}

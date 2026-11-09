"use client";

import { useState, type ReactNode } from "react";

export function ClassroomLayout({
  lesson,
  notebook,
  tutor,
}: {
  lesson: ReactNode;
  notebook: ReactNode;
  tutor: ReactNode;
}) {
  const [tab, setTab] = useState<"cours" | "cahier" | "tuteur">("cours");
  const tabs = [
    { id: "cours" as const, label: "Cours" },
    { id: "cahier" as const, label: "Cahier" },
    { id: "tuteur" as const, label: "Tuteur" },
  ];

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-1.5 rounded-xl border border-ink/10 bg-white p-1.5 lg:hidden">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === t.id ? "bg-board text-white" : "text-ink-soft hover:bg-ink/5"
            }`}
            aria-pressed={tab === t.id}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
        <div className={tab === "cours" ? "block" : "hidden lg:block"}>{lesson}</div>
        <div className={tab === "cahier" ? "block" : "hidden lg:block"}>{notebook}</div>
        <div className={tab === "tuteur" ? "block lg:hidden" : "hidden"}>{tutor}</div>
      </div>
      <div className="mt-6 hidden lg:block">{tutor}</div>
    </div>
  );
}

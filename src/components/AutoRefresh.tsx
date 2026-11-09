"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ active, intervalMs = 3000 }: { active: boolean; intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(timer);
  }, [active, intervalMs, router]);

  if (!active) return null;
  return (
    <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-accent-yellow/20 px-3 py-1 text-xs font-medium text-[#7a5b00]">
      <span className="h-2 w-2 animate-pulse rounded-full bg-accent-coral" />
      Traitement en cours — mise à jour automatique
    </p>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "yellow" | "coral" | "slate";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-ink/5 text-ink-soft",
    green: "bg-board/10 text-board-deep",
    yellow: "bg-accent-yellow/25 text-[#7a5b00]",
    coral: "bg-accent-coral/15 text-[#a33c22]",
    slate: "bg-slate-deep/10 text-slate-deep",
  };
  return <span className={`chip ${tones[tone]}`}>{children}</span>;
}

export function ProgressBar({
  value,
  tone = "board",
  label,
}: {
  value: number;
  tone?: "board" | "yellow" | "coral";
  label?: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  const colors = { board: "bg-board-soft", yellow: "bg-accent-yellow", coral: "bg-accent-coral" };
  return (
    <div>
      {label ? (
        <div className="mb-1 flex items-center justify-between text-xs text-ink-soft">
          <span>{label}</span>
          <span className="font-semibold tabular-nums">{pct} %</span>
        </div>
      ) : null}
      <div className="h-2 w-full overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full ${colors[tone]} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink/20 bg-white/50 p-8 text-center">
      <p className="font-display text-lg text-ink">{title}</p>
      {children ? <div className="mt-2 text-sm text-ink-soft">{children}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "board",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "board" | "yellow" | "coral" | "slate";
}) {
  const ring: Record<string, string> = {
    board: "border-board/20",
    yellow: "border-accent-yellow/40",
    coral: "border-accent-coral/30",
    slate: "border-slate-deep/15",
  };
  return (
    <div className={`card p-5 ${ring[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-1 font-display text-2xl text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-faint">{hint}</p> : null}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-display text-xl text-ink">{children}</h2>
      {action}
    </div>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/tableau-de-bord" className="inline-flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-yellow font-display text-lg font-bold text-slate-deep">
        K
      </span>
      <span className={`font-display text-lg tracking-tight ${light ? "text-white" : "text-ink"}`}>
        Kwiga
        <span className={`ml-2 hidden text-xs font-sans font-medium uppercase tracking-widest sm:inline ${light ? "text-white/60" : "text-ink-faint"}`}>
          salle de classe
        </span>
      </span>
    </Link>
  );
}

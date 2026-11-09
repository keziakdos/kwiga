"use client";

import { useEffect, useMemo, useState } from "react";
import { LAYER_FRAMES, pickScenario, type GenScenario } from "@/lib/animations";

const LAYERS = ["Application", "Transport", "Réseau", "Liaison", "Physique"];

function NodeBox({ x, label, sub, active }: { x: number; label: string; sub: string; active: boolean }) {
  return (
    <g transform={`translate(${x},150)`}>
      <rect
        x={-48}
        y={-31}
        width={96}
        height={62}
        rx={10}
        fill={active ? "#f4c430" : "#ffffff"}
        stroke={active ? "#b88f00" : "#94a39a"}
        strokeWidth={active ? 2.5 : 1.5}
        className="transition-all duration-500"
      />
      <text textAnchor="middle" y={-6} fontSize={12} fontWeight={700} fill="#0f172a">
        {label}
      </text>
      <text textAnchor="middle" y={10} fontSize={9} fill="#4b5a50">
        {sub}
      </text>
    </g>
  );
}

function ScenarioAnimation({ scenario }: { scenario: GenScenario }) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const frames = scenario.frames;
  const n = scenario.nodes.length;

  useEffect(() => {
    setStep(0);
    setPlaying(false);
  }, [scenario.id]);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setStep((s) => (s + 1) % frames.length), 2300);
    return () => clearInterval(timer);
  }, [playing, frames.length]);

  const xs = scenario.nodes.map((_, i) => (n === 1 ? 350 : 80 + i * (540 / (n - 1))));
  const frame = frames[step];
  const packetX = frame.packetAt !== undefined ? xs[frame.packetAt] : null;

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-board-deep">
          Schéma animé — {scenario.caption}
        </p>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setStep((s) => (s - 1 + frames.length) % frames.length)} className="rounded-lg border border-ink/15 px-2 py-1 text-xs text-ink-soft hover:bg-ink/5" aria-label="Étape précédente">◀</button>
          <button type="button" onClick={() => setPlaying((p) => !p)} className={`rounded-lg px-2.5 py-1 text-xs font-medium ${playing ? "bg-board text-white" : "border border-ink/15 text-ink-soft hover:bg-ink/5"}`}>
            {playing ? "Pause" : "Lecture"}
          </button>
          <button type="button" onClick={() => setStep((s) => (s + 1) % frames.length)} className="rounded-lg border border-ink/15 px-2 py-1 text-xs text-ink-soft hover:bg-ink/5" aria-label="Étape suivante">▶</button>
          <span className="ml-1 text-xs tabular-nums text-ink-faint">{step + 1} / {frames.length}</span>
        </div>
      </div>

      <svg viewBox="0 0 700 260" className="mt-2 w-full" role="img" aria-label={`Schéma animé : ${scenario.caption}`}>
        {scenario.links.map(([a, b], i) => (
          <line key={i} x1={xs[a]} y1={150} x2={xs[b]} y2={150} stroke="#94a39a" strokeWidth={3} />
        ))}
        {scenario.nodes.map((node, i) => (
          <NodeBox key={i} x={xs[i]} label={node.label} sub={node.sub} active={frame.active.includes(i)} />
        ))}
        {packetX !== null ? (
          <g style={{ transform: `translateX(${packetX}px)`, transition: "transform 700ms ease-in-out" }}>
            <circle cx={0} cy={150} r={9} fill="#ef7a5a" stroke="#ffffff" strokeWidth={2}>
              <animate attributeName="r" values="8;11;8" dur="1.4s" repeatCount="indefinite" />
            </circle>
            {frame.packetLabel ? (
              <text x={0} y={128} textAnchor="middle" fontSize={9} fill="#a33c22">{frame.packetLabel}</text>
            ) : null}
          </g>
        ) : null}
      </svg>

      <div className="mt-2 rounded-xl bg-board/5 px-3.5 py-2.5">
        <p className="text-sm font-semibold text-ink">{frame.title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{frame.detail}</p>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {frames.map((f, i) => (
          <button key={i} type="button" onClick={() => setStep(i)} className={`h-1.5 w-8 rounded-full transition ${i === step ? "bg-board" : "bg-ink/15 hover:bg-ink/30"}`} aria-label={`Aller à l'étape ${i + 1}`} />
        ))}
      </div>
    </div>
  );
}

function LayersAnimation() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const frames = LAYER_FRAMES;

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setStep((s) => (s + 1) % frames.length), 2300);
    return () => clearInterval(timer);
  }, [playing, frames.length]);

  const frame = frames[step];

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-board-deep">Schéma animé — encapsulation</p>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setStep((s) => (s - 1 + frames.length) % frames.length)} className="rounded-lg border border-ink/15 px-2 py-1 text-xs text-ink-soft hover:bg-ink/5" aria-label="Étape précédente">◀</button>
          <button type="button" onClick={() => setPlaying((p) => !p)} className={`rounded-lg px-2.5 py-1 text-xs font-medium ${playing ? "bg-board text-white" : "border border-ink/15 text-ink-soft hover:bg-ink/5"}`}>{playing ? "Pause" : "Lecture"}</button>
          <button type="button" onClick={() => setStep((s) => (s + 1) % frames.length)} className="rounded-lg border border-ink/15 px-2 py-1 text-xs text-ink-soft hover:bg-ink/5" aria-label="Étape suivante">▶</button>
          <span className="ml-1 text-xs tabular-nums text-ink-faint">{step + 1} / {frames.length}</span>
        </div>
      </div>

      <svg viewBox="0 0 700 280" className="mt-2 w-full" role="img" aria-label="Encapsulation dans les couches réseau">
        {LAYERS.map((layer, i) => (
          <g key={layer}>
            <rect x={150} y={10 + i * 54} width={400} height={50} rx={8} fill={step === i ? "#f4c430" : "#ffffff"} stroke="#94a39a" className="transition-all duration-500" />
            <text x={350} y={40 + i * 54} textAnchor="middle" fontSize={13} fill="#0f172a" fontWeight={600}>{layer}</text>
          </g>
        ))}
        <g style={{ transform: `translateY(${34 + step * 54}px)`, transition: "transform 600ms ease-in-out" }}>
          <rect x={600} y={-6} width={54} height={22} rx={5} fill="#ef7a5a" />
          <text x={627} y={9} textAnchor="middle" fontSize={9} fill="#ffffff">données</text>
        </g>
      </svg>

      <div className="mt-2 rounded-xl bg-board/5 px-3.5 py-2.5">
        <p className="text-sm font-semibold text-ink">{frame.title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{frame.detail}</p>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {frames.map((f, i) => (
          <button key={i} type="button" onClick={() => setStep(i)} className={`h-1.5 w-8 rounded-full transition ${i === step ? "bg-board" : "bg-ink/15 hover:bg-ink/30"}`} aria-label={`Aller à l'étape ${i + 1}`} />
        ))}
      </div>
    </div>
  );
}

export function NetworkAnimation({ title, context = "" }: { title: string; context?: string }) {
  const scenario = useMemo(() => pickScenario(`${title} ${context}`), [title, context]);
  if (scenario === "layers") return <LayersAnimation />;
  return <ScenarioAnimation scenario={scenario} />;
}

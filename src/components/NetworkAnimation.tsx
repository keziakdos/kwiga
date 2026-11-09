"use client";

import { useEffect, useMemo, useState } from "react";

type Mode = "packet" | "layers";

type Frame = { title: string; detail: string };

const PACKET_FRAMES: Frame[] = [
  { title: "1. Le poste prépare les données", detail: "Le message est encapsulé en trame et quitte le PC." },
  { title: "2. Le switch commute", detail: "Le switch lit l'adresse MAC et transmet la trame vers le routeur." },
  { title: "3. Le routeur route", detail: "Le routeur lit l'adresse IP de destination et choisit la sortie." },
  { title: "4. Le serveur reçoit et répond", detail: "La requête atteint le serveur, qui renvoie la réponse." },
];

const LAYER_FRAMES: Frame[] = [
  { title: "1. Application", detail: "HTTP ou DNS préparent le message à envoyer." },
  { title: "2. Transport", detail: "TCP/UDP découpe et ajoute les ports source et destination." },
  { title: "3. Réseau", detail: "IP ajoute les adresses réseau de source et de destination." },
  { title: "4. Liaison", detail: "Ethernet encapsule le paquet dans une trame avec les adresses MAC." },
  { title: "5. Physique", detail: "Les bits sont transmis sur le câble ou par ondes radio." },
];

const PACKET_X = [92, 252, 432, 612];
const LAYERS = ["Application", "Transport", "Réseau", "Liaison", "Physique"];

function NodeBox({
  x,
  label,
  sub,
  active,
}: {
  x: number;
  label: string;
  sub: string;
  active: boolean;
}) {
  return (
    <g transform={`translate(${x},150)`}>
      <rect
        x={-46}
        y={-30}
        width={92}
        height={60}
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

export function NetworkAnimation({ title }: { title: string }) {
  const mode: Mode = useMemo(
    () => (/osi|couche|encapsul|tcp\/?ip|modèle/i.test(title) ? "layers" : "packet"),
    [title],
  );
  const frames = mode === "layers" ? LAYER_FRAMES : PACKET_FRAMES;
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setStep(0);
    setPlaying(false);
  }, [mode]);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setStep((s) => (s + 1) % frames.length);
    }, 2200);
    return () => clearInterval(timer);
  }, [playing, frames.length]);

  const frame = frames[step];

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-board-deep">
          Schéma animé — {mode === "layers" ? "encapsulation" : "circulation d'un paquet"}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStep((s) => (s - 1 + frames.length) % frames.length)}
            className="rounded-lg border border-ink/15 px-2 py-1 text-xs text-ink-soft hover:bg-ink/5"
            aria-label="Étape précédente"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
              playing ? "bg-board text-white" : "border border-ink/15 text-ink-soft hover:bg-ink/5"
            }`}
          >
            {playing ? "Pause" : "Lecture"}
          </button>
          <button
            type="button"
            onClick={() => setStep((s) => (s + 1) % frames.length)}
            className="rounded-lg border border-ink/15 px-2 py-1 text-xs text-ink-soft hover:bg-ink/5"
            aria-label="Étape suivante"
          >
            ▶
          </button>
          <span className="ml-1 text-xs tabular-nums text-ink-faint">
            {step + 1} / {frames.length}
          </span>
        </div>
      </div>

      {mode === "packet" ? (
        <svg viewBox="0 0 700 260" className="mt-2 w-full" role="img" aria-label="Ordinateurs communicant à travers un switch et un routeur">
          <line x1={138} y1={150} x2={206} y2={150} stroke="#94a39a" strokeWidth={3} />
          <line x1={298} y1={150} x2={386} y2={150} stroke="#94a39a" strokeWidth={3} />
          <line x1={478} y1={150} x2={566} y2={150} stroke="#94a39a" strokeWidth={3} />
          <NodeBox x={92} label="PC" sub="apprenant" active={step === 0} />
          <NodeBox x={252} label="Switch" sub="couche 2" active={step === 1} />
          <NodeBox x={432} label="Routeur" sub="couche 3" active={step === 2} />
          <NodeBox x={612} label="Serveur" sub="destination" active={step === 3} />
          <g
            style={{ transform: `translateX(${PACKET_X[step]}px)`, transition: "transform 700ms ease-in-out" }}
          >
            <circle cx={0} cy={150} r={9} fill="#ef7a5a" stroke="#ffffff" strokeWidth={2}>
              <animate attributeName="r" values="8;11;8" dur="1.4s" repeatCount="indefinite" />
            </circle>
            <text x={0} y={132} textAnchor="middle" fontSize={9} fill="#a33c22">
              paquet
            </text>
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 700 280" className="mt-2 w-full" role="img" aria-label="Encapsulation dans les couches réseau">
          <rect x={150} y={10} width={400} height={50} rx={8} fill={step === 0 ? "#f4c430" : "#ffffff"} stroke="#94a39a" />
          <text x={350} y={40} textAnchor="middle" fontSize={13} fill="#0f172a" fontWeight={600}>{LAYERS[0]}</text>
          <rect x={150} y={64} width={400} height={50} rx={8} fill={step === 1 ? "#f4c430" : "#ffffff"} stroke="#94a39a" />
          <text x={350} y={94} textAnchor="middle" fontSize={13} fill="#0f172a" fontWeight={600}>{LAYERS[1]}</text>
          <rect x={150} y={118} width={400} height={50} rx={8} fill={step === 2 ? "#f4c430" : "#ffffff"} stroke="#94a39a" />
          <text x={350} y={148} textAnchor="middle" fontSize={13} fill="#0f172a" fontWeight={600}>{LAYERS[2]}</text>
          <rect x={150} y={172} width={400} height={50} rx={8} fill={step === 3 ? "#f4c430" : "#ffffff"} stroke="#94a39a" />
          <text x={350} y={202} textAnchor="middle" fontSize={13} fill="#0f172a" fontWeight={600}>{LAYERS[3]}</text>
          <rect x={150} y={226} width={400} height={50} rx={8} fill={step === 4 ? "#f4c430" : "#ffffff"} stroke="#94a39a" />
          <text x={350} y={256} textAnchor="middle" fontSize={13} fill="#0f172a" fontWeight={600}>{LAYERS[4]}</text>
          <g style={{ transform: `translateY(${34 + step * 54}px)`, transition: "transform 600ms ease-in-out" }}>
            <rect x={600} y={-6} width={54} height={22} rx={5} fill="#ef7a5a" />
            <text x={627} y={9} textAnchor="middle" fontSize={9} fill="#ffffff">données</text>
          </g>
        </svg>
      )}

      <div className="mt-2 rounded-xl bg-board/5 px-3.5 py-2.5">
        <p className="text-sm font-semibold text-ink">{frame.title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{frame.detail}</p>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {frames.map((f, i) => (
          <button
            key={f.title}
            type="button"
            onClick={() => setStep(i)}
            className={`h-1.5 w-8 rounded-full transition ${
              i === step ? "bg-board" : "bg-ink/15 hover:bg-ink/30"
            }`}
            aria-label={`Aller à l'étape ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

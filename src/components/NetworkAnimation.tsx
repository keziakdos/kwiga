"use client";

import { useEffect, useMemo, useState } from "react";

type Frame = { title: string; detail: string };

const LAYERS = ["Application", "Transport", "Réseau", "Liaison", "Physique"];
const LAYER_FRAMES: Frame[] = [
  { title: "1. Application", detail: "HTTP ou DNS préparent le message à envoyer." },
  { title: "2. Transport", detail: "TCP/UDP découpe et ajoute les ports source et destination." },
  { title: "3. Réseau", detail: "IP ajoute les adresses réseau de source et de destination." },
  { title: "4. Liaison", detail: "Ethernet encapsule le paquet dans une trame avec les adresses MAC." },
  { title: "5. Physique", detail: "Les bits sont transmis sur le câble ou par ondes radio." },
];

type NodeDef = { label: string; sub: string };
type GenFrame = {
  title: string;
  detail: string;
  active: number[];
  packetAt?: number;
  packetLabel?: string;
};
type GenScenario = {
  id: string;
  caption: string;
  nodes: NodeDef[];
  links: Array<[number, number]>;
  frames: GenFrame[];
};

const SCENARIOS: GenScenario[] = [
  {
    id: "dhcp",
    caption: "Attribution DHCP (DORA)",
    nodes: [
      { label: "PC", sub: "sans adresse IP" },
      { label: "Serveur DHCP", sub: "distribue les baux" },
    ],
    links: [[0, 1]],
    frames: [
      { title: "1. Discover", detail: "Le PC diffuse une demande : « qui peut me donner une adresse IP ? »", active: [0, 1], packetAt: 1, packetLabel: "Discover" },
      { title: "2. Offer", detail: "Le serveur propose une adresse, un masque, une passerelle et un DNS.", active: [1, 0], packetAt: 0, packetLabel: "Offer" },
      { title: "3. Request", detail: "Le PC demande officiellement l'adresse proposée.", active: [0, 1], packetAt: 1, packetLabel: "Request" },
      { title: "4. Ack", detail: "Le serveur confirme : l'adresse est réservée pour la durée du bail.", active: [1, 0], packetAt: 0, packetLabel: "Ack" },
    ],
  },
  {
    id: "dns",
    caption: "Résolution DNS d'un nom de domaine",
    nodes: [
      { label: "PC", sub: "client" },
      { label: "Résolveur DNS", sub: "interroge la hiérarchie" },
      { label: "Serveur autoritaire", sub: "connaît le domaine" },
      { label: "Site web", sub: "adresse IP finale" },
    ],
    links: [[0, 1], [1, 2], [0, 3]],
    frames: [
      { title: "1. Cache local", detail: "Le PC vérifie d'abord son cache DNS : si la réponse est connue, il l'utilise.", active: [0] },
      { title: "2. Requête au résolveur", detail: "Le PC demande l'adresse IP du nom au résolveur configuré.", active: [0, 1], packetAt: 1, packetLabel: "question" },
      { title: "3. Interrogation", detail: "Le résolveur interroge le serveur qui fait autorité pour le domaine.", active: [1, 2], packetAt: 2, packetLabel: "question" },
      { title: "4. Réponse", detail: "La réponse remonte avec l'enregistrement A (IPv4) ou AAAA (IPv6).", active: [2, 1, 0], packetAt: 0, packetLabel: "réponse + IP" },
      { title: "5. Connexion", detail: "Le PC contacte le site avec l'adresse IP obtenue ; le nom n'est plus nécessaire.", active: [0, 3], packetAt: 3, packetLabel: "requête HTTP" },
    ],
  },
  {
    id: "vlan",
    caption: "Commutation et VLAN",
    nodes: [
      { label: "PC-A", sub: "VLAN 10" },
      { label: "Switch", sub: "table MAC / 802.1Q" },
      { label: "PC-B", sub: "VLAN 20" },
      { label: "Routeur", sub: "inter-VLAN" },
    ],
    links: [[0, 1], [2, 1], [1, 3]],
    frames: [
      { title: "1. Trame reçue", detail: "La trame arrive sur un port d'accès du VLAN 10.", active: [0, 1], packetAt: 1, packetLabel: "trame" },
      { title: "2. Apprentissage MAC", detail: "Le switch associe l'adresse MAC source au port d'entrée.", active: [1] },
      { title: "3. Même VLAN", detail: "Si la destination est dans le VLAN 10, le switch commute directement.", active: [1, 0], packetAt: 0, packetLabel: "trame" },
      { title: "4. VLAN différent", detail: "Entre VLAN 10 et 20, le trafic doit passer par le routeur (ou un switch de niveau 3).", active: [1, 3, 2], packetAt: 2, packetLabel: "routé" },
    ],
  },
  {
    id: "nat",
    caption: "Traduction d'adresses (NAT / PAT)",
    nodes: [
      { label: "PC privé", sub: "192.168.1.10" },
      { label: "Routeur NAT", sub: "traduit les adresses" },
      { label: "Internet", sub: "adresse publique" },
    ],
    links: [[0, 1], [1, 2]],
    frames: [
      { title: "1. Paquet sortant", detail: "Le PC envoie un paquet depuis 192.168.1.10 vers un serveur public.", active: [0, 1], packetAt: 1, packetLabel: "192.168.1.10:50000" },
      { title: "2. Traduction", detail: "Le routeur remplace l'adresse privée par son adresse publique et un port.", active: [1], packetAt: 1, packetLabel: "203.0.113.5:62000" },
      { title: "3. Réponse", detail: "Le serveur répond à l'adresse publique du routeur.", active: [2, 1], packetAt: 1, packetLabel: "réponse" },
      { title: "4. Retour", detail: "Le routeur consulte sa table NAT et renvoie le paquet au bon PC interne.", active: [1, 0], packetAt: 0, packetLabel: "retour" },
    ],
  },
  {
    id: "routing",
    caption: "Choix de route",
    nodes: [
      { label: "PC", sub: "réseau local" },
      { label: "Routeur", sub: "table de routage" },
      { label: "Routeur suivant", sub: "next hop" },
      { label: "Serveur distant", sub: "autre réseau" },
    ],
    links: [[0, 1], [1, 2], [2, 3]],
    frames: [
      { title: "1. Destination", detail: "Le routeur lit l'adresse IP de destination du paquet.", active: [1] },
      { title: "2. Table de routage", detail: "Il cherche la route la plus précise : réseau, masque, passerelle, interface.", active: [1] },
      { title: "3. Next hop", detail: "La route indique la prochaine passerelle à joindre.", active: [1, 2], packetAt: 2, packetLabel: "paquet" },
      { title: "4. Livraison", detail: "Le paquet atteint le réseau de destination ; le TTL a diminué à chaque routeur.", active: [2, 3], packetAt: 3, packetLabel: "paquet" },
    ],
  },
  {
    id: "wifi",
    caption: "Accès Wi-Fi sécurisé",
    nodes: [
      { label: "PC portable", sub: "client Wi-Fi" },
      { label: "Point d'accès", sub: "SSID / WPA2-3" },
      { label: "Switch", sub: "réseau local" },
      { label: "Internet", sub: "routeur / FAI" },
    ],
    links: [[0, 1], [1, 2], [2, 3]],
    frames: [
      { title: "1. Association", detail: "Le client choisit le SSID et s'associe au point d'accès.", active: [0, 1], packetAt: 1, packetLabel: "association" },
      { title: "2. Chiffrement", detail: "WPA2/WPA3 établit une clé de session : les échanges sont chiffrés.", active: [1] },
      { title: "3. Trame relayée", detail: "Le point d'accès transforme le trafic radio en trafic Ethernet.", active: [1, 2], packetAt: 2, packetLabel: "trame" },
      { title: "4. Vers Internet", detail: "Le routeur achemine ensuite le trafic vers le réseau étendu.", active: [2, 3], packetAt: 3, packetLabel: "paquet IP" },
    ],
  },
  {
    id: "security",
    caption: "Filtrage par pare-feu",
    nodes: [
      { label: "PC", sub: "source" },
      { label: "Pare-feu", sub: "règles / ACL" },
      { label: "Serveur", sub: "protégé" },
    ],
    links: [[0, 1], [1, 2]],
    frames: [
      { title: "1. Requête entrante", detail: "Le paquet arrive sur l'interface du pare-feu.", active: [0, 1], packetAt: 1, packetLabel: "paquet" },
      { title: "2. Analyse", detail: "Le pare-feu vérifie la source, la destination, le port et le protocole.", active: [1] },
      { title: "3. Décision", detail: "Une règle autorise ou bloque explicitement ; le refus par défaut est plus sûr.", active: [1] },
      { title: "4. Journalisation", detail: "L'événement est journalisé pour l'analyse et la détection d'incident.", active: [2], packetAt: 2, packetLabel: "si autorisé" },
    ],
  },
  {
    id: "packet",
    caption: "Circulation d'un paquet",
    nodes: [
      { label: "PC", sub: "apprenant" },
      { label: "Switch", sub: "couche 2" },
      { label: "Routeur", sub: "couche 3" },
      { label: "Serveur", sub: "destination" },
    ],
    links: [[0, 1], [1, 2], [2, 3]],
    frames: [
      { title: "1. Préparation", detail: "Le message est encapsulé en trame et quitte le PC.", active: [0], packetAt: 0, packetLabel: "paquet" },
      { title: "2. Commutation", detail: "Le switch lit l'adresse MAC et transmet la trame vers le routeur.", active: [0, 1], packetAt: 1, packetLabel: "trame" },
      { title: "3. Routage", detail: "Le routeur lit l'adresse IP et choisit la sortie appropriée.", active: [1, 2], packetAt: 2, packetLabel: "paquet IP" },
      { title: "4. Réponse", detail: "Le serveur traite la requête et renvoie la réponse.", active: [2, 3], packetAt: 3, packetLabel: "réponse" },
    ],
  },
];

function pickScenario(text: string): GenScenario | "layers" {
  const t = text.toLowerCase();
  if (/osi|couche|encapsul|tcp\s*\/?\s*ip|mod[eè]le/.test(t)) return "layers";
  if (/dhcp|dora|bail|adresse automatique/.test(t)) return SCENARIOS.find((s) => s.id === "dhcp")!;
  if (/\bdns\b|nom de domaine|r[eé]solution|r[eé]solveur|enregistrement a\b/.test(t)) return SCENARIOS.find((s) => s.id === "dns")!;
  if (/vlan|trunk|commutation|switch|mac\b|802\.1q/.test(t)) return SCENARIOS.find((s) => s.id === "vlan")!;
  if (/\bnat\b|\bpat\b|traduction d.adresse|adresse publique/.test(t)) return SCENARIOS.find((s) => s.id === "nat")!;
  if (/rout|passerelle|table de routage|next hop|inter-vlan/.test(t)) return SCENARIOS.find((s) => s.id === "routing")!;
  if (/wi-?fi|wlan|ssid|802\.11/.test(t)) return SCENARIOS.find((s) => s.id === "wifi")!;
  if (/pare-feu|firewall|\bacl\b|s[eé]curit[eé]|filtrage/.test(t)) return SCENARIOS.find((s) => s.id === "security")!;
  return SCENARIOS.find((s) => s.id === "packet")!;
}

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

export function getAnimationOutline(
  title: string,
  context = "",
): { caption: string; steps: Array<{ title: string; detail: string }> } {
  const scenario = pickScenario(`${title} ${context}`);
  if (scenario === "layers") {
    return { caption: "Encapsulation", steps: LAYER_FRAMES.map((f) => ({ title: f.title, detail: f.detail })) };
  }
  return {
    caption: scenario.caption,
    steps: scenario.frames.map((f) => ({ title: f.title, detail: f.detail })),
  };
}

export function NetworkAnimation({ title, context = "" }: { title: string; context?: string }) {
  const scenario = useMemo(() => pickScenario(`${title} ${context}`), [title, context]);
  if (scenario === "layers") return <LayersAnimation />;
  return <ScenarioAnimation scenario={scenario} />;
}

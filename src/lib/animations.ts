export type Frame = { title: string; detail: string };
export type NodeDef = { label: string; sub: string };
export type GenFrame = {
  title: string;
  detail: string;
  active: number[];
  packetAt?: number;
  packetLabel?: string;
};
export type GenScenario = {
  id: string;
  caption: string;
  nodes: NodeDef[];
  links: Array<[number, number]>;
  frames: GenFrame[];
};

export const LAYER_FRAMES: Frame[] = [
  { title: "1. Application", detail: "HTTP ou DNS préparent le message à envoyer." },
  { title: "2. Transport", detail: "TCP/UDP découpe et ajoute les ports source et destination." },
  { title: "3. Réseau", detail: "IP ajoute les adresses réseau de source et de destination." },
  { title: "4. Liaison", detail: "Ethernet encapsule le paquet dans une trame avec les adresses MAC." },
  { title: "5. Physique", detail: "Les bits sont transmis sur le câble ou par ondes radio." },
];

export const SCENARIOS: GenScenario[] = [
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

export function pickScenario(text: string): GenScenario | "layers" {
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

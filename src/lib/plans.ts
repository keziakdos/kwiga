import { getDb } from "./db";

export type PlanNotion = {
  title: string;
  summary: string;
  explanation?: string;
  example?: string;
  diagram?: string;
  references?: string[];
};

export type PlanExercise = {
  type: "qcm" | "open" | "subnet" | "topology" | "troubleshooting" | "lab";
  prompt: string;
  options?: string[];
  correct?: string;
  criteria?: string;
  points?: number;
};

export type PlanModule = {
  title: string;
  description: string;
  notions: PlanNotion[];
  exercises?: PlanExercise[];
};

export type PlanContent = {
  prerequisites: string[];
  order: string;
  modules: PlanModule[];
};

const RESEAU_PLAN: PlanContent = {
  prerequisites: [
    "Savoir utiliser un ordinateur et un navigateur",
    "Aucune connaissance réseau préalable n'est exigée",
    "Notions de base sur les nombres binaires (présentées dans le parcours)",
  ],
  order:
    "Suivre les modules dans l'ordre : comprendre le modèle en couches avant l'adressage, puis le calcul de sous-réseaux, la commutation/VLAN, le routage et enfin les services et la sécurité.",
  modules: [
    {
      title: "Module 1 — Les fondations : modèles OSI et TCP/IP",
      description: "Comprendre comment les données circulent en couches et situer chaque protocole.",
      notions: [
        {
          title: "Le modèle OSI en 7 couches",
          summary:
            "Le modèle OSI découpe la communication réseau en 7 couches : physique, liaison, réseau, transport, session, présentation, application. Chaque couche rend un service à la couche supérieure.",
          explanation:
            "On retient les couches de bas en haut : physique (câbles, signaux), liaison (trames, adresses MAC), réseau (paquets IP, routage), transport (TCP/UDP, ports), session, présentation, application (HTTP, DNS). En pratique, TCP/IP regroupe les couches hautes.",
          example:
            "Lors d'un accès à un site web : Ethernet porte la trame (liaison), IP achemine le paquet (réseau), TCP garantit la livraison (transport), HTTP formule la requête (application).",
          diagram:
            "graph TD\n  A[Application - HTTP, DNS] --> B[Transport - TCP, UDP]\n  B --> C[Réseau - IP]\n  C --> D[Liaison - Ethernet]\n  D --> E[Physique - câbles, ondes]",
        },
        {
          title: "Le modèle TCP/IP et l'encapsulation",
          summary:
            "TCP/IP comporte 4 couches : accès réseau, Internet, transport, application. L'encapsulation ajoute un en-tête à chaque couche.",
          explanation:
            "Les données descendent la pile : un message HTTP devient un segment TCP, puis un paquet IP, puis une trame Ethernet. À la réception, la décapsulation retire les en-têtes dans l'ordre inverse.",
          example:
            "Un ping envoie un paquet ICMP encapsulé dans IP puis dans Ethernet ; le switch lit la trame, le routeur lit le paquet IP.",
        },
      ],
      exercises: [
        {
          type: "qcm",
          prompt: "À quelle couche OSI appartient le protocole IP ?",
          options: ["Couche 2 — liaison", "Couche 3 — réseau", "Couche 4 — transport", "Couche 7 — application"],
          correct: "Couche 3 — réseau",
          points: 1,
        },
      ],
    },
    {
      title: "Module 2 — Adressage IPv4 et IPv6",
      description: "Maîtriser les adresses, masques et la logique binaire nécessaire au sous-réseautage.",
      notions: [
        {
          title: "Adresse IPv4, masque et notation CIDR",
          summary:
            "Une adresse IPv4 fait 32 bits, notée en 4 octets décimaux. Le masque indique la partie réseau et la partie hôte ; /24 signifie 24 bits de réseau.",
          explanation:
            "Exemple : 192.168.1.10/24. Le masque 255.255.255.0 garde les 3 premiers octets comme réseau (192.168.1.0). L'adresse .0 est le réseau, .255 la diffusion, .1 à .254 sont utilisables.",
          example: "192.168.1.10/24 → réseau 192.168.1.0, hôtes 192.168.1.1 à 192.168.1.254, broadcast 192.168.1.255.",
        },
        {
          title: "Adressage IPv6",
          summary:
            "IPv6 utilise 128 bits en hexadécimal, notés en 8 groupes séparés par ':'. Il supprime le besoin de NAT et simplifie l'en-tête.",
          explanation:
            "On abrège les zéros : 2001:0db8:0000:0000:0000:0000:0000:0001 devient 2001:db8::1. Les préfixes usuels vont de /48 à /64 pour les réseaux locaux.",
          example: "fe80::1 est une adresse locale de lien ; 2001:db8::/32 est un préfixe documentaire.",
        },
      ],
      exercises: [
        {
          type: "subnet",
          prompt: "Combien d'adresses hôtes utilisables contient un sous-réseau /27 ?",
          correct: "30",
          criteria: "2^(32-27) = 32 adresses, moins l'adresse réseau et la diffusion = 30 hôtes utilisables.",
          points: 2,
        },
      ],
    },
    {
      title: "Module 3 — Calcul de sous-réseaux",
      description: "Découper un réseau en sous-réseaux et vérifier l'appartenance d'une adresse.",
      notions: [
        {
          title: "Méthode de découpage en sous-réseaux",
          summary:
            "Pour découper, on emprunte des bits à la partie hôte. Chaque bit ajouté double le nombre de sous-réseaux et réduit de moitié les hôtes par sous-réseau.",
          explanation:
            "Un /24 découpé en /26 donne 4 sous-réseaux de 64 adresses (62 hôtes utilisables). Les blocs sont 0, 64, 128, 192. L'adresse 192.168.1.70 appartient au bloc 64 (64 à 127).",
          example: "192.168.1.0/24 → /26 : 192.168.1.0, .64, .128, .192.",
        },
      ],
    },
    {
      title: "Module 4 — Ethernet, commutation et VLAN",
      description: "Comprendre la couche 2, l'apprentissage des switches et la segmentation logique.",
      notions: [
        {
          title: "Ethernet et adresse MAC",
          summary:
            "Ethernet est le standard de réseau local filaire. Chaque interface possède une adresse MAC de 48 bits ; le switch apprend sur quel port se trouve chaque MAC.",
          explanation:
            "Quand une trame arrive, le switch note l'adresse source et son port dans sa table CAM. S'il connaît la destination, il commute vers le bon port ; sinon il diffuse (flood).",
          example: "AA:BB:CC:DD:EE:01 branchée sur le port 5 : le switch associe cette MAC au port 5.",
        },
        {
          title: "VLAN et trunk 802.1Q",
          summary:
            "Un VLAN segmente logiquement un switch en plusieurs réseaux. Les liens trunk transportent plusieurs VLAN grâce à l'étiquette 802.1Q.",
          explanation:
            "On configure des ports en accès (un VLAN) et des ports trunk (plusieurs VLAN). Deux machines dans des VLAN différents ne communiquent pas sans routeur ou switch de niveau 3.",
          example: "VLAN 10 pour l'administration, VLAN 20 pour les utilisateurs ; un trunk entre deux switches porte les deux.",
        },
      ],
      exercises: [
        {
          type: "qcm",
          prompt: "Que fait un switch quand la MAC de destination est inconnue ?",
          options: ["Il jette la trame", "Il la diffuse sur tous les ports sauf le port source", "Il l'envoie au routeur", "Il la renvoie à l'expéditeur"],
          correct: "Il la diffuse sur tous les ports sauf le port source",
          points: 1,
        },
      ],
    },
    {
      title: "Module 5 — Routage",
      description: "Relier des réseaux différents et lire une table de routage.",
      notions: [
        {
          title: "Rôle du routeur et table de routage",
          summary:
            "Le routeur relie des réseaux IP différents. Il choisit la meilleure route selon la destination et la métrique, puis réécrit l'en-tête de liaison.",
          explanation:
            "Une route a une destination, un masque, une passerelle et une interface. La route par défaut 0.0.0.0/0 sert de porte de sortie quand aucune route plus précise n'existe.",
          example: "ip route 10.0.0.0 255.0.0.0 192.168.1.1 : tout trafic vers 10.0.0.0/8 part vers 192.168.1.1.",
        },
      ],
    },
    {
      title: "Module 6 — Services réseau : DNS, DHCP, NAT",
      description: "Comprendre les services qui rendent le réseau utilisable au quotidien.",
      notions: [
        {
          title: "DNS",
          summary:
            "Le DNS traduit les noms de domaine en adresses IP. Une requête interroge des serveurs hiérarchiques jusqu'à obtenir la réponse, souvent mise en cache.",
          explanation:
            "Le client interroge son résolveur, qui questionne la racine, le serveur du TLD puis le serveur faisant autorité. Les enregistrements courants sont A (IPv4), AAAA (IPv6), CNAME, MX.",
          example: "kwiga.rwazap.com → enregistrement A → 148.230.124.5.",
        },
        {
          title: "DHCP",
          summary:
            "DHCP attribue automatiquement une adresse IP, un masque, une passerelle et des serveurs DNS. Le processus se déroule en DORA : Discover, Offer, Request, Ack.",
          explanation:
            "Le bail a une durée ; le client renouvelle avant expiration. Un serveur DHCP doit être sécurisé pour éviter les serveurs pirates (rogue DHCP).",
          example: "Un PC demande une IP, le serveur propose 192.168.1.50/24 pour 24 h.",
        },
        {
          title: "NAT",
          summary:
            "Le NAT traduit les adresses privées en adresse publique. Le NAT de port (PAT) permet à plusieurs machines de partager une seule IP publique.",
          explanation:
            "Le routeur maintient une table de traductions port source ↔ port public. Le NAT masque les adresses internes mais ne remplace pas un pare-feu.",
          example: "192.168.1.10:50000 sort en 203.0.113.5:62000 ; la réponse est retraduite vers l'intérieur.",
        },
      ],
      exercises: [
        {
          type: "qcm",
          prompt: "Quel service attribue automatiquement une adresse IP à un poste ?",
          options: ["DNS", "DHCP", "NAT", "ARP"],
          correct: "DHCP",
          points: 1,
        },
      ],
    },
    {
      title: "Module 7 — Wi-Fi et sécurité réseau",
      description: "Sécuriser les échanges et diagnostiquer les pannes courantes.",
      notions: [
        {
          title: "Wi-Fi et sécurité sans fil",
          summary:
            "Le Wi-Fi (802.11) utilise des canaux radio. WPA2/WPA3 chiffrent les échanges ; un mot de passe faible ou un WPS activé fragilise le réseau.",
          explanation:
            "On distingue les bandes 2,4 GHz (portée, canaux encombrés) et 5 GHz (débit, portée réduite). Un réseau invité doit être isolé du réseau interne.",
          example: "Un SSID invité sur un VLAN séparé limite l'accès aux ressources internes.",
        },
        {
          title: "Diagnostic réseau méthodique",
          summary:
            "Diagnostiquer de bas en haut : lien physique, adresse IP, passerelle, DNS, service applicatif. Chaque étape élimine une cause possible.",
          explanation:
            "Outils usuels : ipconfig/ip a, ping, traceroute, nslookup, ss/netstat. On vérifie d'abord le lien et l'adresse, puis la connectivité locale, puis Internet.",
          example: "Pas d'accès web : vérifier le câble, l'IP, ping de la passerelle, puis résolution DNS.",
        },
      ],
      exercises: [
        {
          type: "troubleshooting",
          prompt:
            "Un poste obtient 169.254.x.x. Quelle est la cause la plus probable et que vérifier en premier ?",
          criteria:
            "Réponse attendue : échec d'obtention DHCP (APIPA). Vérifier le câble/lien, le serveur DHCP, le VLAN et l'étendue DHCP.",
          points: 3,
        },
      ],
    },
  ],
};

const CYBER_PLAN: PlanContent = {
  prerequisites: ["Bases réseaux (modèle OSI, IP, ports)", "Notions de systèmes Linux et Windows"],
  order: "Commencer par les concepts de sécurité défensive, puis les vulnérabilités courantes et les bonnes pratiques.",
  modules: [
    {
      title: "Module 1 — Fondamentaux de la cybersécurité",
      description: "Confidentialité, intégrité, disponibilité et surface d'attaque.",
      notions: [
        {
          title: "Triade CIA et surface d'attaque",
          summary:
            "La sécurité vise la confidentialité, l'intégrité et la disponibilité. La surface d'attaque regroupe tous les points d'entrée possibles.",
          explanation:
            "Réduire la surface d'attaque : fermer les services inutiles, mettre à jour, limiter les privilèges, segmenter le réseau.",
          example: "Un serveur exposé avec un service obsolète augmente la surface d'attaque.",
        },
      ],
    },
    {
      title: "Module 2 — Hygiène et défense en profondeur",
      description: "Mots de passe, mises à jour, sauvegardes, moindre privilège.",
      notions: [
        {
          title: "Défense en profondeur",
          summary:
            "Empiler plusieurs couches de protection : pare-feu, segmentation, authentification forte, sauvegardes, supervision.",
          explanation:
            "Aucune couche n'est infaillible. La segmentation limite la propagation ; les sauvegardes permettent de récupérer après rançongiciel.",
          example: "Un réseau invité isolé, des sauvegardes hors ligne et une authentification multifacteur.",
        },
      ],
      exercises: [
        {
          type: "lab",
          prompt:
            "Dans un laboratoire virtuel autorisé, listez les ports ouverts d'une machine de test et proposez une réduction de surface d'attaque.",
          criteria: "Utilisation d'un environnement autorisé, relevé des ports, justification des services à désactiver.",
          points: 3,
        },
      ],
    },
  ],
};

const WEB_PLAN: PlanContent = {
  prerequisites: ["Savoir utiliser un éditeur de texte", "Notions de fichiers et de dossiers"],
  order: "HTML puis CSS, puis JavaScript, ensuite hébergement et sécurité web.",
  modules: [
    {
      title: "Module 1 — HTML et CSS",
      description: "Structurer une page et la mettre en forme de façon responsive.",
      notions: [
        {
          title: "HTML sémantique",
          summary:
            "HTML structure le contenu avec des balises sémantiques : header, nav, main, section, article, footer.",
          explanation:
            "Une structure sémantique améliore l'accessibilité et le référencement. Chaque page a un seul h1 et une hiérarchie de titres cohérente.",
          example: "Une page d'accueil avec header, nav, main et footer est plus accessible qu'une succession de div.",
        },
        {
          title: "CSS responsive et espacement",
          summary:
            "Le CSS contrôle la présentation. Les media queries et les unités relatives adaptent l'affichage au mobile.",
          explanation:
            "Approche mobile-first : concevoir pour petit écran puis élargir. Utiliser des variables CSS pour la palette et l'espacement.",
          example: "Une grille qui passe de 1 colonne sur mobile à 3 colonnes sur desktop.",
        },
      ],
    },
    {
      title: "Module 2 — JavaScript et hébergement",
      description: "Interactions côté client, puis mise en ligne et bonnes pratiques.",
      notions: [
        {
          title: "JavaScript côté client",
          summary:
            "JavaScript manipule le DOM et gère les interactions. Les appels fetch récupèrent des données sans recharger la page.",
          explanation:
            "Toujours valider côté serveur aussi. Ne jamais stocker de secret dans le code client.",
          example: "Un formulaire envoie une requête fetch et affiche un message de succès.",
        },
        {
          title: "Sécurité web de base",
          summary:
            "HTTPS, validation des entrées, protection contre XSS et injections, mises à jour régulières.",
          explanation:
            "Échapper les sorties, utiliser des requêtes paramétrées côté serveur, configurer les en-têtes de sécurité.",
          example: "Un champ commentaire doit être échappé avant affichage pour éviter une injection de script.",
        },
      ],
    },
  ],
};

export const DEFAULT_PLANS: Record<string, PlanContent> = {
  reseau: RESEAU_PLAN,
  cybersecurite: CYBER_PLAN,
  webmaster: WEB_PLAN,
};

export function getDefaultPlan(domain: string): PlanContent {
  return DEFAULT_PLANS[domain] ?? RESEAU_PLAN;
}

export function getPlanForCourse(courseId: number) {
  const db = getDb();
  return db
    .prepare("SELECT * FROM plans WHERE course_id = ? ORDER BY version DESC LIMIT 1")
    .get(courseId) as
    | { id: number; course_id: number; version: number; status: string; content_json: string; created_at: string }
    | undefined;
}

export function saveProposedPlan(courseId: number, content: PlanContent): number {
  const db = getDb();
  const last = db
    .prepare("SELECT MAX(version) AS v FROM plans WHERE course_id = ?")
    .get(courseId) as { v: number | null };
  const version = (last.v ?? 0) + 1;
  db.prepare("UPDATE plans SET status = 'proposed' WHERE course_id = ? AND status = 'proposed'").run(courseId);
  const res = db
    .prepare("INSERT INTO plans (course_id, version, status, content_json) VALUES (?, ?, 'proposed', ?)")
    .run(courseId, version, JSON.stringify(content));
  return Number(res.lastInsertRowid);
}

export function materializePlan(courseId: number, planId: number, content: PlanContent) {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM exercises WHERE course_id = ?").run(courseId);
    db.prepare("DELETE FROM notions WHERE course_id = ?").run(courseId);
    db.prepare("DELETE FROM modules WHERE course_id = ?").run(courseId);

    let notionOrd = 0;
    content.modules.forEach((module, moduleIndex) => {
      const moduleRes = db
        .prepare(
          "INSERT INTO modules (course_id, plan_id, title, description, ord) VALUES (?, ?, ?, ?, ?)",
        )
        .run(courseId, planId, module.title, module.description, moduleIndex);
      const moduleId = Number(moduleRes.lastInsertRowid);

      for (const notion of module.notions) {
        const notionRes = db
          .prepare(
            `INSERT INTO notions (course_id, module_id, title, summary, explanation, example, diagram, references_json, ord)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            courseId,
            moduleId,
            notion.title,
            notion.summary,
            notion.explanation ?? null,
            notion.example ?? null,
            notion.diagram ?? null,
            notion.references ? JSON.stringify(notion.references) : null,
            notionOrd++,
          );
        const notionId = Number(notionRes.lastInsertRowid);

        for (const ex of module.exercises ?? []) {
          db.prepare(
            `INSERT INTO exercises (course_id, notion_id, type, prompt, options_json, correct_json, criteria_json, points)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          ).run(
            courseId,
            notionId,
            ex.type,
            ex.prompt,
            ex.options ? JSON.stringify(ex.options) : null,
            ex.correct ? JSON.stringify(ex.correct) : null,
            ex.criteria ? JSON.stringify(ex.criteria) : null,
            ex.points ?? 1,
          );
        }
      }
    });

    db.prepare("UPDATE plans SET status = 'validated' WHERE id = ?").run(planId);
    db.prepare(
      "UPDATE courses SET status = CASE WHEN status = 'archived' THEN status ELSE 'active' END, updated_at = datetime('now') WHERE id = ?",
    ).run(courseId);
    const first = db
      .prepare("SELECT id FROM notions WHERE course_id = ? ORDER BY ord LIMIT 1")
      .get(courseId) as { id: number } | undefined;
    if (first) {
      db.prepare("UPDATE courses SET current_notion_id = COALESCE(current_notion_id, ?) WHERE id = ?").run(
        first.id,
        courseId,
      );
    }
  });
  tx.immediate();
}

export function extractDocumentContext(courseId: number, userId: number, maxChars = 12000): string {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT dc.content FROM document_chunks dc
       JOIN documents d ON d.id = dc.document_id
       WHERE d.course_id = ? AND d.user_id = ? AND d.status = 'done'
       ORDER BY d.id, dc.seq
       LIMIT 40`,
    )
    .all(courseId, userId) as Array<{ content: string }>;
  let out = "";
  for (const row of rows) {
    if ((out + row.content).length > maxChars) break;
    out += row.content + "\n\n---\n\n";
  }
  return out;
}

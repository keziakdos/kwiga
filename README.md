# Kwiga — Ma salle de classe

Application web éducative privée pour apprendre les **réseaux informatiques** (puis la cybersécurité et le
développement web) à partir de **vos propres PDF ou notes**, avec un **tuteur IA strictement textuel**.

> Kwiga est un outil pédagogique privé. Il ne s'agit ni d'une formation officielle Cisco, ni d'une
> certification. Les évaluations produites par l'IA sont indicatives.

Comptes au lancement : **Keziakdos** (administrateur) et **didioos** (apprenant). Aucun mot de passe
n'est fourni par défaut : ils sont créés via la commande d'initialisation sécurisée (`npm run seed`).
Éditeur affiché dans les mentions légales : **Keziakdos**.

## Fonctionnalités

- **Comptes privés** : connexion par identifiant, aucun formulaire d'inscription publique. Rôles
  `admin` / `apprenant`. Mot de passe temporaire à changement obligatoire.
- **Parcours** : 3 actifs maximum par personne, limite **vérifiée côté serveur** (transaction SQLite
  `BEGIN IMMEDIATE`), configurable par l'administrateur. Archivage, réactivation, suppression.
- **Documents** : import PDF (validation format/taille/pages), notes collées structurées par sections.
  Extraction **page par page**, statuts `en attente / en cours / terminé / erreur`, détection des PDF
  scannés sans OCR.
- **Salle de classe** : tableau vert profond, cahier crème, onglets sur mobile, schémas Mermaid.
- **Tuteur textuel** : connaît le parcours, la notion et les documents ; récupération locale des passages
  pertinents (SQLite FTS5), jamais le PDF entier. Distingue document / complément général / incertitude.
- **Exercices** : QCM, questions ouvertes avec critères, calculs de sous-réseaux, diagnostic. Correction
  déterministe ou par IA ; les réponses non corrigées ne valident pas la maîtrise.
- **Progression** : distinction claire **avancement** (notions travaillées) et **maîtrise** (évaluations
  réussies), historique, révisions.
- **Administration** : utilisateurs, limites, statistiques agrégées, erreurs, journal d'audit, budget IA.
- **Budget IA** : plafond, dépenses, réservation atomique avant appel, réconciliation, alertes 50/80/95 %.
- **Aucune fonction audio** : pas de microphone, pas de synthèse vocale, pas de Gemini Live.

## Stack

| Élément | Choix |
|---|---|
| Application | Next.js 15 (App Router) + TypeScript + Tailwind CSS |
| Base de données | SQLite (WAL) sur volume privé, migrations intégrées |
| Fichiers | Volume privé, jamais exposé publiquement |
| Authentification | Sessions serveur + cookie httpOnly + Argon2id |
| Recherche documentaire | SQLite FTS5 (pas d'embeddings payants) |
| IA | Couche d'abstraction `google` / `openrouter` / `null` |
| Déploiement | Conteneur Docker + Nginx existant (reverse proxy) |

Les alternatives (Supabase, PostgreSQL, Redis, base vectorielle) ont été écartées pour un déploiement à
2 utilisateurs sur un VPS à faibles ressources. Voir `DEPLOY.md` et `BUDGET.md`.

## Démarrage local (WSL)

```bash
npm install
cp .env.example .env          # remplir SESSION_SECRET et DATA_DIR
npm run db:migrate
ADMIN_USERNAME=... ADMIN_PASSWORD='...' LEARNER_PASSWORD='...' npm run seed
npm run dev                   # http://localhost:3000
```

Pour une exécution de type production :

```bash
npm run build
npm run start
```

## Tests

```bash
npm test          # Vitest : auth, isolation, limite de parcours, budget, texte, exercices
npm run typecheck
```

Couverture des critères minimaux : refus anonyme, isolation entre comptes, limite de 3 parcours,
persistance après fermeture de la base, contrôle budgétaire IA, pagination des documents.

## Documentation

- [`INSTALL.md`](INSTALL.md) — installation locale et sur un autre serveur
- [`DEPLOY.md`](DEPLOY.md) — déploiement isolé sur VPS partagé, DNS, HTTPS, retour arrière
- [`BACKUP_RESTORE.md`](BACKUP_RESTORE.md) — sauvegarde et restauration testable
- [`SECURITY.md`](SECURITY.md) — modèle de sécurité et bonnes pratiques
- [`BUDGET.md`](BUDGET.md) — coûts, quotas, formule du budget IA

## Structure

```
src/app/            pages et Server Actions (routes publiques, apprenant, admin)
src/components/     composants UI, salle de classe, tuteur, exercices
src/lib/            db, auth, cours, documents, jobs, RAG, IA, budget, progression
scripts/            migration, seed, création admin, smoke test
tests/              tests Vitest
deploy/             vhost Nginx de référence
```

## État actuel

MVP **déployé** sur https://kwiga.rwazap.com (conteneur `kwiga-app`, port local `3020`, Nginx + HTTPS
Let's Encrypt). Vérifications effectuées le 9 novembre 2026 : pages publiques et privées, redirection
anonyme, refus des API, comptes `Keziakdos` (admin) et `didioos` (apprenant), sites préexistants
intacts.

Le tuteur IA est actuellement **non configuré** (`AI_PROVIDER=null`) : l'application affiche cet état
et les cours restent accessibles. La configuration IA et la sauvegarde planifiée sont les prochaines
étapes d'exploitation.

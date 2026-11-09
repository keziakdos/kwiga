# INSTALL — Installation de Kwiga

Deux contextes : **développement local (WSL)** et **installation sur un autre serveur**. Pour le
déploiement sur le VPS partagé existant, voir `DEPLOY.md`.

## Prérequis

- Node.js 22 et npm 10
- Git
- (optionnel) Docker ou Podman pour le conteneur
- Aucun service externe obligatoire : PostgreSQL, Redis et Supabase ne sont pas nécessaires.

## 1. Installation locale

```bash
git clone https://github.com/keziakdos/kwiga.git
cd kwiga
npm install
cp .env.example .env
```

Éditez `.env` :

```ini
APP_URL=http://localhost:3000
SESSION_SECRET=<chaîne aléatoire de 32+ caractères>
DATA_DIR=./data
```

Générer un secret :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## 2. Base de données et comptes initiaux

```bash
npm run db:migrate
ADMIN_USERNAME=votre_identifiant \
ADMIN_PASSWORD='UnMotDePasseSolide123' \
LEARNER_USERNAME=didioos \
LEARNER_PASSWORD='MotDePasseTemporaire123' \
npm run seed
```

Ou de façon interactive (recommandé, aucun secret dans l'historique) :

```bash
npm run seed
```

Le script demande l'identifiant et le mot de passe (saisie masquée), crée l'administrateur et
l'apprenant, et force le changement du mot de passe temporaire de l'apprenant à la première connexion.

Pour créer/réparer uniquement un administrateur :

```bash
npm run create-admin
```

Règles de mot de passe : 12 caractères minimum, majuscule, minuscule, chiffre.

## 3. Lancer l'application

Développement :

```bash
npm run dev
```

Production locale :

```bash
npm run build
npm run build:cli      # génère dist/cli (seed, migrate, create-admin) pour le conteneur
npm run start
```

## 4. Configuration de l'IA (facultatif)

Sans configuration, le tuteur affiche clairement « IA non configurée » et les cours restent accessibles.

### Option A — OpenRouter (modèles `:free`)

```ini
AI_PROVIDER=openrouter
AI_MODEL=google/gemma-4-31b-it:free
AI_API_KEY=sk-or-...
AI_PRICE_INPUT_EUR_PER_MTOK=0
AI_PRICE_OUTPUT_EUR_PER_MTOK=0
```

### Option B — Google Gemini

```ini
AI_PROVIDER=google
AI_MODEL=gemini-3.5-flash-lite
AI_API_KEY=...
AI_PRICE_INPUT_EUR_PER_MTOK=0.09
AI_PRICE_OUTPUT_EUR_PER_MTOK=0.36
```

Les noms de modèles, tarifs et conditions de rétention **changent** : vérifiez les pages officielles
(OpenRouter : `openrouter.ai/collections/free-models` ; Google : `aistudio.google.com/docs/pricing`)
avant le lancement, puis renseignez les tarifs utilisés. Les compteurs internes sont des **estimations**.

> Attention vie privée : certains tiers gratuits peuvent réutiliser les données pour améliorer leurs
> produits. Voir `SECURITY.md`.

## 5. Installation sur un autre serveur (sans Docker)

1. Installer Node.js 22, Nginx, Certbot.
2. Cloner le dépôt dans un répertoire dédié, par exemple `/srv/kwiga`.
3. `npm ci && npm run build && npm run build:cli`.
4. Créer `.env` (droits `600`), avec `DATA_DIR=/srv/kwiga-data` hors du dépôt.
5. `node dist/cli/migrate.js` puis `node dist/cli/seed.js`.
6. Lancer avec un gestionnaire de service (systemd) : `node .next/standalone/server.js`, `PORT=3020`,
   `HOSTNAME=127.0.0.1`, utilisateur non privilégié.
7. Configurer Nginx en reverse proxy vers `127.0.0.1:3020` et activer HTTPS.
8. Vérifier : `/connexion` répond, `/tableau-de-bord` redirige sans session.

## Vérifications après installation

```bash
curl -I http://127.0.0.1:3020/connexion        # 200
curl -I http://127.0.0.1:3020/tableau-de-bord  # 307 vers /connexion
```

- Le fichier `DATA_DIR/kwiga.sqlite` existe et n'est **pas** accessible par le serveur web.
- Aucun secret dans `git status` ni dans les logs.

# DEPLOY — Déploiement sur kwiga.rwazap.com (VPS partagé)

> **Règle absolue : ne rien perturber d'autre sur le VPS.** Chaque étape indique où l'exécuter, avec
> quel utilisateur, son impact et le retour arrière. Aucune étape proxy n'est exécutée sans accord
> explicite préalable et sauvegarde.

## Contexte mesuré (lecture seule, à re-vérifier au moment du déploiement)

- Ubuntu 24.04, **1 vCPU**, disque 27 Go libres, **~120 Mo de RAM disponibles**, **aucun swap**.
- Docker 29.9.2 + Compose v5.6.1, Nginx + Certbot déjà en place sur 80/443.
- 11 conteneurs existants (rwatradeweb, rwaresto, rwazap-news, n8n, coach, amabaruwa…).
- `kwiga.rwazap.com` résout déjà vers `148.230.124.5`.
- Port `3020` libre.

**Conséquence** : l'image est construite **hors VPS** (WSL/CI), puis transférée. Le conteneur est limité
en mémoire et n'écoute que sur `127.0.0.1:3020`.

## 0. (Recommandé) Ajouter du swap — À VALIDER

Avec ~120 Mo libres et aucun swap, le risque d'OOM est réel. Ajout d'un swap de 2 Go :

```bash
# SUR LE VPS, utilisateur trading, AVEC ACCORD
sudo fallocate -l 2G /swapfile-kwiga
sudo chmod 600 /swapfile-kwiga
sudo mkswap /swapfile-kwiga
sudo swapon /swapfile-kwiga
free -h
```

Impact : ajoute de la mémoire d'échange (réversible). Le rendre persistant nécessiterait d'éditer
`/etc/fstab` — à faire seulement avec accord. **Retour arrière** :

```bash
sudo swapoff /swapfile-kwiga && sudo rm /swapfile-kwiga
```

Sans swap, prévoyez une surveillance et un `mem_limit` strict.

## 1. Construire l'image (WSL, pas le VPS)

```bash
cd ~/projets/kwiga
podman build -t kwiga:latest .
mkdir -p /tmp/kwiga-transfer
podman save kwiga:latest | gzip > /tmp/kwiga-transfer/kwiga-image.tar.gz
ls -lh /tmp/kwiga-transfer/kwiga-image.tar.gz
```

Impact : local uniquement. Retour arrière : supprimer le fichier.

## 2. Préparer le répertoire sur le VPS (utilisateur `trading`)

```bash
# SUR LE VPS
mkdir -p ~/kwiga
```

Impact : crée un répertoire dédié. Retour arrière : `rm -rf ~/kwiga` (uniquement si Kwiga n'y tourne pas).

## 3. Transférer l'image et les fichiers (depuis WSL)

```bash
scp /tmp/kwiga-transfer/kwiga-image.tar.gz trading@148.230.124.5:~/kwiga/
scp docker-compose.yml .env trading@148.230.124.5:~/kwiga/
```

Le fichier `.env` de production doit contenir au minimum :

```ini
APP_URL=https://kwiga.rwazap.com
SESSION_SECRET=<secret de production>
DATA_DIR=/app/data
PORT=3020
AI_PROVIDER=null            # ou openrouter/google
LEGAL_EDITOR_NAME=...
LEGAL_CONTACT_EMAIL=...
```

N'envoyez jamais `.env` par messagerie ou dépôt Git.

## 4. Charger l'image et démarrer (VPS, `trading`)

```bash
# SUR LE VPS
cd ~/kwiga
chmod 600 .env
docker load -i kwiga-image.tar.gz
docker compose up -d
docker compose ps
docker logs --tail 20 kwiga-app
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3020/connexion   # attendu 200
```

Impact : crée le conteneur `kwiga-app`, le réseau et le volume `kwiga_data`. N'affecte aucun autre
conteneur. **Retour arrière** :

```bash
cd ~/kwiga && docker compose down
```

(Le volume `kwiga_data` est conservé ; ne le supprimez pas sans sauvegarde.)

## 5. Créer les comptes initiaux (VPS, `trading`)

Mode interactif recommandé (saisie masquée, pas de secret en clair) :

```bash
docker exec -it kwiga-app node dist/cli/seed.js
```

Le script demande l'identifiant administrateur, son mot de passe, et crée `didioos` avec un mot de
passe temporaire à changer à la première connexion. Notez le mot de passe temporaire affiché une fois.

Alternative non interactive (le secret apparaît dans l'environnement du processus — à éviter) :

```bash
docker exec -e ADMIN_USERNAME=... -e ADMIN_PASSWORD=... kwiga-app node dist/cli/seed.js
```

## 6. Nginx — étape HTTP (VPS, `trading`, AVEC ACCORD)

**Sauvegarde d'abord :**

```bash
sudo cp -a /etc/nginx/sites-enabled ~/backups/nginx-sites-enabled-$(date +%F-%H%M)
sudo cp -a /etc/nginx/sites-available ~/backups/nginx-sites-available-$(date +%F-%H%M)
```

**Ajout du vhost (HTTP seul pour l'instant) :**

```bash
sudo tee /etc/nginx/sites-available/kwiga.rwazap.com.conf > /dev/null <<'EOF'
server {
    listen 80;
    server_name kwiga.rwazap.com;

    location /.well-known/acme-challenge/ { root /var/www/certbot; }

    location / {
        proxy_pass http://127.0.0.1:3020;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90s;
        client_max_body_size 30m;
    }
}
EOF
sudo ln -s /etc/nginx/sites-available/kwiga.rwazap.com.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

`nginx -t` doit afficher `syntax is ok` avant tout rechargement. **Retour arrière** :

```bash
sudo rm /etc/nginx/sites-enabled/kwiga.rwazap.com.conf
sudo nginx -t && sudo systemctl reload nginx
# ou restaurer la sauvegarde si nécessaire
```

Vérifier **Kwiga et les sites existants** :

```bash
curl -I http://kwiga.rwazap.com/connexion
curl -I https://news.rwazap.com
curl -I https://coach.rwazap.com
curl -I https://resto.rwazap.com
```

## 7. HTTPS (VPS, `trading`, AVEC ACCORD)

```bash
sudo certbot --nginx -d kwiga.rwazap.com
```

Impact : obtient le certificat et modifie le vhost Kwiga (Certbot gère la redirection HTTPS).
Sauvegardez de nouveau le vhost juste avant. **Retour arrière** :

```bash
sudo certbot delete --cert-name kwiga.rwazap.com   # puis restaurer le vhost HTTP
```

Vérifications :

```bash
curl -I https://kwiga.rwazap.com/connexion
sudo systemctl status nginx --no-pager | head -5
```

## 8. Vérifications finales

- Connexion administrateur, changement de mot de passe forcé pour `didioos`.
- Import d'un PDF, extraction terminée, citation de page visible.
- Création d'un parcours, validation d'un plan, quiz, déconnexion/reconnexion et progression conservée.
- `docker restart kwiga-app` puis vérifier que les données sont toujours là.
- Les sites préexistants répondent (voir étape 6).

## 9. Mise à jour ultérieure

Sur WSL : reconstruire l'image, `podman save`, transférer. Sur le VPS :

```bash
cd ~/kwiga
docker compose down
docker load -i kwiga-image.tar.gz
docker compose up -d
```

Les migrations s'appliquent automatiquement au démarrage (`src/instrumentation.ts`). **Sauvegardez la
base avant toute mise à jour** (`BACKUP_RESTORE.md`).

## Ce qui n'est PAS fait par ce document

- Aucune modification DNS (déjà réalisée par le propriétaire du domaine).
- Aucune modification du pare-feu, de SSH ou des services partagés.
- Aucun `docker system prune`, aucune suppression de conteneur/volume existant.

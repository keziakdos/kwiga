# BACKUP & RESTORE — Sauvegarde et restauration

Kwiga stocke deux choses sur le volume `kwiga_data` :

- la base SQLite : `/app/data/kwiga.sqlite` (+ `-wal`, `-shm`) ;
- les fichiers privés : `/app/data/uploads/`.

Une sauvegarde locale sur le VPS ne protège **pas** contre la perte du serveur : conservez toujours une
copie **hors VPS** (WSL, disque externe, autre machine).

## 1. Sauvegarde à chaud (recommandée)

SQLite permet une copie cohérente sans arrêter l'application via `VACUUM INTO`.

```bash
# SUR LE VPS, utilisateur trading
DATE=$(date +%F-%H%M)
mkdir -p ~/backups/kwiga/$DATE
docker exec kwiga-app node -e "const D=require('better-sqlite3');const db=new D('/app/data/kwiga.sqlite');db.exec(\"VACUUM INTO '/app/data/kwiga-$DATE.sqlite'\");db.close();"
docker cp kwiga-app:/app/data/kwiga-$DATE.sqlite ~/backups/kwiga/$DATE/kwiga.sqlite
docker cp kwiga-app:/app/data/uploads ~/backups/kwiga/$DATE/uploads
docker exec kwiga-app rm -f /app/data/kwiga-$DATE.sqlite
```

Vérifier l'intégrité :

```bash
docker exec kwiga-app node -e "const D=require('better-sqlite3');const db=new D('/app/data/kwiga.sqlite',{readonly:true});console.log(db.pragma('integrity_check'));"
```

## 2. Copie hors VPS

Depuis WSL :

```bash
scp -r trading@148.230.124.5:~/backups/kwiga/<DATE> ~/backups-kwiga/
```

Puis copiez ce dossier vers un emplacement externe (disque chiffré, autre machine). Testez la
restauration au moins une fois.

## 3. Restauration

```bash
# SUR LE VPS (après avoir sauvegardé l'état actuel)
DATE=<dossier de sauvegarde>
cd ~/kwiga
docker compose down

# Sauvegarde de sécurité de l'état courant
docker run --rm -v kwiga_data:/data -v $HOME/backups:/backup alpine \
  tar czf /backup/kwiga-avant-restauration-$(date +%F-%H%M).tgz -C /data .

# Restauration
docker run --rm -v kwiga_data:/data -v $HOME/backups/kwiga/$DATE:/backup alpine sh -c \
  "rm -rf /data/* && cp /backup/kwiga.sqlite /data/kwiga.sqlite && cp -r /backup/uploads /data/uploads && chown -R 10001:10001 /data"

docker compose up -d
docker exec kwiga-app node -e "const D=require('better-sqlite3');const db=new D('/app/data/kwiga.sqlite',{readonly:true});console.log(db.pragma('integrity_check'), db.prepare('SELECT COUNT(*) n FROM users').get());"
```

Vérifier ensuite : connexion, parcours, documents, progression.

## 4. Sauvegarde complète (froide)

Si vous préférez arrêter brièvement le service :

```bash
cd ~/kwiga
docker compose stop
docker run --rm -v kwiga_data:/data -v $HOME/backups:/backup alpine \
  tar czf /backup/kwiga-complet-$(date +%F-%H%M).tgz -C /data .
docker compose start
```

Impact : Kwiga indisponible quelques secondes ; **les autres conteneurs ne sont pas touchés**.

## 5. Fréquence conseillée

- Base + fichiers : **quotidien** (tâche planifiée côté VPS ou depuis WSL).
- Copie hors VPS : **hebdomadaire minimum**.
- Test de restauration : **à chaque évolution majeure** et au moins une fois par trimestre.

Ne jamais placer de sauvegarde contenant des données personnelles dans Git.

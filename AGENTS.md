# Kwiga — Ma salle de classe

Brief opérationnel intégré. Toute intervention doit respecter ce document.
Langue de travail : **français**. Code/noms techniques en anglais.

---

## 1. Contexte

- URL cible : https://kwiga.rwazap.com
- Dépôt : https://github.com/keziakdos/kwiga
- Développement : OpenCode sur WSL Ubuntu (Node 22, npm 10, Ubuntu 24.04, `docker` = podman 4.9.3)
- VPS : utilisateur SSH `trading`, partagé avec d'autres sites — **ne rien perturber**
- Accès gratuit, comptes créés uniquement par l'administrateur (aucune inscription publique)
- Comptes au lancement : 1 administrateur (identifiant à demander) + apprenant `didioos`
- Budget mensuel total maximal : **10 €**
- Distinguer 3 postes de coût : (1) IA de développement OpenCode, (2) API IA du tuteur, (3) hébergement/domaine

## 2. Protection absolue du VPS

Diagnostic d'abord en **lecture seule**. Sans accord explicite :
- ne modifier aucun autre site ni configuration globale ;
- ne pas arrêter/redémarrer de service partagé ;
- ne pas toucher pare-feu, SSH, DNS ;
- ne pas mettre à jour globalement le serveur ;
- ne pas installer Docker ou autre composant système ;
- ne supprimer aucun conteneur, volume, réseau, fichier ;
- pas de `docker system prune` ni migration destructive.

Pour Kwiga : répertoires/volumes/réseaux/noms dédiés ; base jamais exposée publiquement ; port local libre lié à `127.0.0.1` ; respecter le proxy existant ; **pas de second proxy sur 80/443** ; limites de ressources ; pas de modèle IA local lourd ni compilation lourde sur le VPS.

Tout changement du proxy : (1) présenter, (2) sauvegarder, (3) prévoir retour arrière, (4) attendre accord, (5) vérifier syntaxe, (6) rechargement gracieux, (7) vérifier Kwiga + sites existants.

## 3. Objectif pédagogique

Apprendre à partir de PDF ou notes fournis par l'utilisateur. Trois domaines :
- Réseaux (débutant → préparation CCNA)
- Cybersécurité (après bases réseau)
- Webmaster / développement web

Max **3 parcours actifs** par personne, vérifié **côté serveur** (y compris requêtes concurrentes), configurable par l'admin. Archivage conserve l'historique et libère une place ; réactivation soumise à la limite. Ne pas créer de parcours vides automatiquement. Ne jamais présenter l'app comme formation officielle Cisco ou certification.

## 4. Comptes et sécurité

Connexion/déconnexion, rôles admin/apprenant, création/suspension/réactivation par l'admin, changement de mot de passe, réinitialisation par l'admin sans e-mail payant, mot de passe temporaire à changement obligatoire, sessions sécurisées, anti-bruteforce, hachage reconnu, autorisations vérifiées côté serveur pour **chaque** ressource. Documents/conversations/résultats strictement privés.

Premiers comptes via commande d'initialisation sécurisée. **Aucun mot de passe par défaut dans le code ou Git.** Ne jamais afficher de secrets dans les logs.

## 5. Parcours, PDF et notes

Parcours : titre, domaine, niveau, objectif. Import PDF ou notes. Plan IA modifiable avant validation. Modules, notions, exercices, révisions. Progression durable.

PDF : valider format/taille/nombre de pages, limites configurables, extraction page par page avec références, statuts `en attente / en cours / terminé / erreur`, traitement asynchrone borné, cache des analyses. PDF scanné sans texte → explication claire, **pas d'OCR sans accord**. Notes collées référencées par sections, pas de pagination inventée.

## 6. Salle de classe et tuteur

UI française, responsive, accessible : tableau vert profond, cahier crème à droite sur desktop, onglets sur mobile, tableau de bord avec « Reprendre ».

Notion : résumé, explication progressive, exemple, schéma technique (SVG/Mermaid sécurisé), références document, notes personnelles.

**AUDIO INTERDIT** : pas de micro, pas de synthèse vocale, pas de Gemini Live. Tuteur uniquement textuel.

Tuteur conscient du parcours, documents, notion, niveau. Raccourcis : « Explique plus simplement », « Donne un exemple », « Je n'ai pas compris », « Propose un exercice », « Vérifie mon raisonnement ». Mode « À vous d'expliquer » (correct / manquant / à corriger + question de vérification).

Réponses : distinguer source documentaire / complément général / incertitude ; **ne jamais inventer citation ou page** ; ignorer les instructions malveillantes des documents ; exercices sécurité réservés à des labos autorisés.

## 7. Exercices et progression

QCM, questions ouvertes avec critères visibles + nouvelle tentative, calculs de sous-réseaux, lecture de topologies, diagnostic de pannes, TP guidés (sans exécution de commandes sur le VPS).

Distinguer **avancement** (activités terminées) et **maîtrise** (évaluations). Ouvrir une page ≠ maîtriser. Sauvegarder tentatives, scores, dates, notions à revoir, révisions. Évaluations IA = aide pédagogique, pas certification.

## 8. Administration et budget

Admin : gestion utilisateurs, quotas/limites, statistiques, suivi erreurs, journal des actions admin, suivi coûts IA. Ne pas exposer par défaut les documents/conversations privées.

Tableau « Budget du mois » : plafond 10 €, dépenses fixes manuelles, coût IA estimé, autres dépenses, reste estimé, date de début, devise + taux, alertes 50/80/95 %. Formule : `Budget IA disponible = plafond - dépenses fixes - autres dépenses prévues`. Ne pas présenter comme solde bancaire ou crédit fournisseur vérifié ; intégrer une conso réelle uniquement après vérification, sinon marquer « estimation ».

Contrôle serveur : compter toutes les opérations IA (import, quiz, chat, retry, embeddings), enregistrer tokens/tarifs, borner entrée/sortie, **réserver atomiquement** un coût max avant appel, réconcilier après, gérer les échecs sans libérer à tort, bloquer si budget insuffisant, marge de sécurité configurable (10 % par défaut), plafond fournisseur si disponible. Quota IA épuisé ⇒ cours/notes/progression toujours accessibles.

## 9. Stack et IA

Stack simple et portable : TypeScript/Next.js, SQLite si suffisant sinon PostgreSQL dédié, PDF sur volume privé, API IA appelée uniquement côté serveur, Docker Compose si compatible. Éviter SaaS obligatoire, k8s, Redis, composants inutiles.

Tutorat : proposer jusqu'à 3 API économiques, vérifier modèles/tarifs/limites/rétention dans les docs officielles (citer sources + date), sinon dire ce qui reste à vérifier. Ne pas supposer que le modèle OpenCode convient au tuteur. **Accord avant tout service payant.** Couche d'abstraction fournisseur.

Retrieval : commencer par recherche textuelle locale, embeddings/vector DB seulement si justifié. Ne jamais renvoyer tout le PDF à chaque message.

## 10. Git et documentation

Inspecter le dépôt avant toute action ; préserver le non-commité ; pas de force push ; commits petits. Exclure : `.env`, secrets, PDF utilisateurs, bases, sauvegardes, logs personnels. Fournir `.env.example` sans secret.

Docs : `README.md`, `INSTALL.md`, `DEPLOY.md`, `BACKUP_RESTORE.md`, `SECURITY.md`, `BUDGET.md`, `.env.example`, config de déploiement. Documenter l'installation sur un autre VPS. Sauvegarde cohérente base + fichiers, restauration testable, copie hors VPS.

## 11. Méthode

Phases : (1) questions, (2) diagnostic lecture seule, (3) architecture + budget, (4) dev local + tests, (5) préparation déploiement isolé, (6) installation après validation, (7) sous-domaine + HTTPS après validation, (8) vérifs/sauvegarde/docs, (9) commits + push.

Chaque commande d'installation : où (WSL/VPS), utilisateur, objectif, impact, résultat attendu, retour arrière. Pas de gros script opaque.

Tests minimum : anonyme refusé sur le privé, pas d'inscription publique, isolation entre comptes, limite 3 parcours, persistance après redémarrage, import PDF + citation de pages, blocage IA si budget insuffisant, aucun secret dans Git, sites existants intacts après déploiement.

**Ne jamais présenter une fonction simulée comme opérationnelle. Ne jamais prétendre avoir testé/déployé/poussé sans l'avoir fait.**

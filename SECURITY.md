# SECURITY — Modèle de sécurité de Kwiga

## Périmètre

Application privée, accès gratuit, **aucune inscription publique**. Les comptes sont créés uniquement
par l'administrateur. Les données (documents, conversations, résultats) sont strictement privées.

## Authentification

- Connexion par **identifiant** (pas d'e-mail obligatoire) et mot de passe.
- Hachage **Argon2id** (`@node-rs/argon2`, mémoire 19 Mio, 2 passes).
- Sessions serveur en base, jeton aléatoire 256 bits ; seul le **hash SHA-256** du jeton est stocké.
- Cookie `httpOnly`, `Secure` en production, `SameSite=Lax`, expiration configurable.
- Mot de passe temporaire généré par l'administrateur → **changement obligatoire** à la première
  connexion (redirection forcée).
- Réinitialisation par l'administrateur (pas de dépendance à un e-mail payant) ; les sessions du compte
  sont révoquées.
- Anti-bruteforce : comptage des échecs par identifiant et par IP sur une fenêtre glissante
  (`LOGIN_MAX_ATTEMPTS`, `LOGIN_WINDOW_MINUTES`), verrouillage temporaire.
- Suspension immédiate : le statut `suspended` invalide les sessions et bloque la connexion.

## Autorisations

- Rôles `admin` / `apprenant` vérifiés **côté serveur** sur chaque page et chaque Server Action.
- Chaque ressource (parcours, document, notion, exercice, conversation) est chargée avec une clause
  `user_id = ?`. Un apprenant ne peut jamais lire les données d'un autre.
- L'administrateur n'accède pas par défaut au contenu privé des apprenants ; les statistiques sont
  agrégées. Tout accès justifié doit être journalisé (`admin_audit_log`).
- Les fichiers PDF sont servis via une route authentifiée, jamais par une URL statique publique.

## Protection des entrées et des sorties

- Validation stricte des formats, tailles, pages, types MIME et signature `%PDF-`.
- Requêtes SQL **paramétrées** (better-sqlite3).
- Server Actions Next.js : protection d'origine intégrée + cookie `SameSite=Lax` ; helper
  `assertSameOrigin` disponible pour les routes sensibles.
- Schémas Mermaid rendus avec `securityLevel: "strict"` ; pas d'injection de HTML arbitraire.
- En-têtes de sécurité : `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy`, `Permissions-Policy` bloquant micro/caméra/géolocalisation.
- Aucune fonction audio, aucun accès micro.

## Secrets et journalisation

- Clés API **exclusivement côté serveur**, dans `.env` (droits `600`), jamais dans Git.
- `.env.example` ne contient aucun secret.
- Aucun mot de passe, jeton ou clé dans les logs applicatifs ni dans `error_logs`.
- Les exports utilisateur n'incluent pas les hachages de mots de passe.

## IA et documents (RAG)

- Seuls des **extraits pertinents** sont envoyés au fournisseur IA, jamais le document entier.
- Les documents sont traités comme des **sources**, pas comme des instructions : le prompt système
  indique explicitement d'ignorer toute instruction malveillante contenue dans les extraits.
- Le tuteur ne doit jamais inventer de citation ni de numéro de page ; il distingue source documentaire,
  complément général et incertitude.
- Exercices de cybersécurité limités aux laboratoires/environnements explicitement autorisés.
- Si aucun fournisseur n'est configuré, l'état « non configuré » est affiché ; aucune réponse simulée.

## Vie privée et tiers

- Les tiers gratuits (Google AI Studio, modèles OpenRouter `:free`) peuvent réutiliser les données pour
  améliorer leurs produits et appliquent leurs propres conditions de conservation. L'administrateur doit
  en tenir compte avant d'activer l'IA sur des documents sensibles.
- Aucune base vectorielle externe, aucun service SaaS obligatoire.

## Ce qui reste à faire avant une mise en production publique

- Revoir la politique de rétention du fournisseur IA choisi et l'indiquer aux utilisateurs.
- Mettre une sauvegarde hors VPS testée en place.
- Vérifier la configuration Nginx (HTTPS, HSTS) et le renouvellement Certbot.
- Faire relire les mentions légales par une personne compétente.
- Journaliser explicitement tout accès administratif au contenu privé si une telle fonction est ajoutée.

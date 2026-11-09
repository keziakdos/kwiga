# BUDGET — Coûts et maîtrise du budget IA

## Principe

Le plafond convenu est **10 €/mois pour l'API du tuteur uniquement**. Il n'inclut ni le développement
(OpenCode), ni l'hébergement, ni le domaine. Il n'est pas obligatoire de consommer ces 10 € : l'objectif
est de rester au plus près de **0 €** grâce aux tiers gratuits.

Trois postes distincts :

| Poste | Payé à | Remarque |
|---|---|---|
| IA de développement (OpenCode/DeepSeek) | fournisseur de développement | hors plafond Kwiga |
| API du tuteur Kwiga | OpenAI / Google / OpenRouter | **plafond 10 €** |
| Hébergement + domaine | VPS existant / registraire | déjà en place |

## Formule affichée dans l'administration

```
Budget IA disponible = plafond
                       − dépenses fixes
                       − autres dépenses prévues
                       − coût IA consommé (estimation)
                       − réservations en cours
                       − marge de sécurité (10 % par défaut)
```

Cette valeur est une **estimation locale**, pas un solde bancaire ni un crédit fournisseur vérifié.
Les chiffres fournisseurs peuvent différer.

## Contrôle côté serveur

À chaque opération IA (génération de plan, chat, correction, nouvelle tentative) :

1. Estimation du coût maximal (tokens d'entrée bornés + tokens de sortie maximaux × tarifs configurés).
2. **Réservation atomique** en base (transaction `BEGIN IMMEDIATE`) : refus si le budget disponible est
   insuffisant.
3. Appel au fournisseur.
4. **Réconciliation** : enregistrement des tokens réels et du coût estimé, clôture de la réservation.
5. En cas d'échec : libération de la réservation, sauf si le fournisseur a pu facturer (erreur 4xx non
   liée à l'authentification), auquel cas le coût estimé est conservé.

Les réservations non réconciliées restent visibles et réduisent le disponible, ce qui évite de
sur-dépenser. Les tarifs sont **configurables** (`AI_PRICE_INPUT_EUR_PER_MTOK`,
`AI_PRICE_OUTPUT_EUR_PER_MTOK`) et doivent être mis à jour après vérification.

Quand le budget est épuisé : les appels IA sont **bloqués proprement**, mais les cours, documents,
notes et progression restent accessibles.

## Limites anti-dérive

- 3 parcours actifs par personne (configurable).
- Documents maximum par personne, taille PDF, nombre de pages, taille des notes.
- Tokens d'entrée et de sortie bornés par requête (`AI_MAX_INPUT_TOKENS`, `AI_MAX_OUTPUT_TOKENS`).
- Traitements simultanés bornés (`MAX_CONCURRENT_JOBS=1`).
- Cache des plans (clé = cours + objectif + extraits) pour éviter de payer deux fois.
- Récupération locale (FTS5) : seuls les extraits pertinents sont envoyés, jamais le PDF entier.

## Fournisseurs et tarifs (à revérifier au lancement)

Sources consultées le **9 novembre 2026**, à revérifier car les modèles et tarifs évoluent :

- **OpenRouter — modèles `:free`** : tarifs 0 $, mais limites **20 req/min** et **50 req/jour**
  (1 000/jour après achat d'environ 10 $ de crédits). Les replis vers des modèles payants sont facturés.
  `openrouter.ai/collections/free-models`, documentation « Free Variant ».
- **Google Gemini** : tier gratuit (entrée/sortie gratuites, quotas réduits, **données utilisées pour
  améliorer les produits**). Tier payant Flash-Lite de l'ordre de **0,10 $/M tokens en entrée** et
  **0,40 $/M en sortie** ; Gemini 2.5 Flash ~**0,30 $ / 2,50 $**.
  `aistudio.google.com/docs/pricing` (page mise à jour 2026-10-30).

Stratégie recommandée : **Gemini free tier** ou **OpenRouter `:free`** en priorité, bascule payante
seulement si les quotas bloquent, avec des tarifs saisis dans `.env`.

## Ordres de grandeur

Avec un modèle payant à 0,10 $/M en entrée et 0,40 $/M en sortie, un échange de **3 000 tokens d'entrée
et 1 000 de sortie** coûte environ **0,0007 $**. Mille échanges coûtent donc environ **0,70 $**, hors
analyse initiale, OCR (non activé), stockage et hébergement. Les 10 € couvrent donc largement un usage
raisonnable à deux utilisateurs.

Inversement, un modèle cher (5 $/M en sortie) rendrait le plafond atteignable beaucoup plus vite : c'est
pourquoi les tarifs sont configurables et les tokens bornés.

## Ce que l'administration affiche

- Plafond, dépenses fixes, autres dépenses, coût IA estimé, réservations, disponible estimé.
- Part du plafond consommée et alertes 50 / 80 / 95 %.
- Détail par opération, fournisseur et modèle (tokens et coût estimé).

## Recommandations d'exploitation

- Surveiller le tableau de bord après chaque import massif ou session de tutorat intense.
- Mettre à jour les tarifs dès qu'un fournisseur change sa grille.
- Activer un plafond côté fournisseur lorsqu'il existe (garde-fou externe).
- Ne jamais partager la clé API : elle pourrait être utilisée ailleurs sans être comptabilisée par Kwiga.

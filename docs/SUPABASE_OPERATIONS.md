# Exploitation Supabase de Fragmenta

La suppression de compte utilise la fonction protégée `delete_own_account('SUPPRIMER')`. Le client retire d'abord les fichiers Storage appartenant au compte, puis la suppression de `auth.users` déclenche les cascades relationnelles. Cette opération est définitive.

L’export personnel utilise la fonction protégée `export_my_data()`. Elle retourne uniquement les données appartenant à l’utilisateur authentifié et exclut les mots de passe, jetons et champs administratifs.

Ce guide définit la procédure minimale pour modifier, sauvegarder et restaurer la base de données Fragmenta sans mettre les données de production en danger.

## Environnements

Fragmenta doit utiliser des projets Supabase séparés :

| Environnement | Données | Utilisation |
|---|---|---|
| Local | Fictives | Développement et tests rapides |
| Développement | Fictives ou anonymisées | Validation partagée des migrations |
| Production | Réelles | Application publiée uniquement |

Une application de développement ne doit jamais utiliser l'URL du projet de production. Les données réelles ne doivent jamais être copiées vers un environnement moins sécurisé sans anonymisation.

## Variables d'environnement

Chaque environnement fournit ses propres valeurs :

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=publishable-key
```

Les variables `EXPO_PUBLIC_` sont incluses dans l'application cliente. Elles peuvent contenir l'URL et la clé publishable, mais jamais :

- la clé `service_role`;
- le mot de passe de la base;
- une clé Stripe secrète;
- un jeton d'administration;
- une chaîne de connexion PostgreSQL.

Les accès clients sont protégés par RLS. Les secrets serveur doivent être conservés dans le gestionnaire de secrets de la plateforme qui exécute le serveur.

## Déploiement d'une migration

Toute modification de schéma suit cet ordre :

1. créer un fichier horodaté dans `supabase/migrations/`;
2. vérifier qu'il ne contient aucun secret ni donnée personnelle;
3. appliquer la migration sur l'environnement local ou de développement;
4. exécuter les assertions dans `supabase/tests/`;
5. tester les parcours concernés dans l'application;
6. ouvrir une pull request et attendre les contrôles automatiques;
7. créer ou vérifier une sauvegarde de production;
8. appliquer exactement la même migration en production;
9. exécuter les assertions de production;
10. inscrire le résultat dans le journal de déploiement.

Il ne faut jamais modifier manuellement une table de production sans créer ensuite une migration équivalente dans le dépôt.

## Sauvegardes

### Sauvegardes gérées par Supabase

Avant une opération importante, vérifier dans **Database → Backups** :

- que les sauvegardes sont actives pour le forfait utilisé;
- la date de la dernière sauvegarde réussie;
- la durée de conservation;
- la disponibilité d'une restauration à un instant précis, si cette option est nécessaire.

Les options et durées disponibles dépendent du forfait Supabase. Une sauvegarde affichée dans le tableau de bord ne remplace pas un test de restauration.

### Sauvegarde logique avant migration

Pour une migration risquée, produire également un export logique avec la CLI Supabase ou `pg_dump`, en suivant la documentation officielle de la version installée.

Le fichier de sauvegarde :

- doit être chiffré;
- ne doit jamais être ajouté à Git;
- doit être stocké dans un emplacement privé;
- doit porter la date, l'environnement et le commit déployé;
- doit avoir une date d'expiration définie.

Convention suggérée :

```text
fragmenta-production-YYYYMMDD-HHMM-commit.dump
```

### Outils versionnés

Les scripts du dossier `scripts/` ne contiennent aucun secret. La connexion est fournie uniquement au moment de l'exécution.

```powershell
.\scripts\backup-database.ps1 -DatabaseUrl $env:FRAGMENTA_DATABASE_URL -OutputDirectory 'D:\FragmentaBackups' -Environment production -Commit '<commit>'
.\scripts\verify-database-backup.ps1 -DumpPath 'D:\FragmentaBackups\fragmenta-production-....dump'
```

Le fichier `.dump`, son empreinte `.sha256` et ses métadonnées `.json` doivent rester ensemble et hors du dépôt. La sauvegarde PostgreSQL contient les tables et les métadonnées Storage, mais pas les fichiers des buckets. Ces fichiers doivent être copiés séparément vers un stockage privé, chiffré et versionné.

## Restauration

Une restauration est une opération exceptionnelle. Avant de la lancer :

1. arrêter les écritures de l'application si possible;
2. confirmer le projet et l'environnement ciblés;
3. identifier le point de restauration;
4. conserver une sauvegarde de l'état actuel;
5. prévenir les personnes responsables;
6. suivre la procédure officielle correspondant au type de sauvegarde;
7. vérifier l'intégrité après restauration;
8. réactiver progressivement les écritures.

Après restauration, vérifier au minimum :

- connexion et création de compte;
- profils;
- aventures et images;
- curiosités et images;
- politiques RLS;
- buckets Storage;
- assertions de `supabase/tests/security_assertions.sql`.

## Test de restauration

Une sauvegarde n'est considérée fiable qu'après un test de restauration.

Fréquence recommandée :

- avant chaque changement majeur de schéma;
- au minimum une fois par trimestre;
- après un changement de forfait ou de stratégie de sauvegarde.

Le test doit être effectué dans un projet isolé, jamais directement dans la production.

```powershell
.\scripts\test-database-restore.ps1 -DumpPath '<backup.dump>' -TargetDatabaseUrl $env:FRAGMENTA_RESTORE_TEST_URL -Confirmation RESTORE-ISOLATED-DATABASE
```

Le script exige cette confirmation exacte et refuse une adresse contenant `prod` ou `production`. Après le chargement, exécuter `supabase/tests/security_assertions.sql`, puis tester la connexion, les messages privés, les images signées, l'export et la suppression de compte. Un fichier jamais restauré ne compte pas comme une sauvegarde validée.

## Journal de déploiement

Pour chaque migration de production, conserver :

| Information | Valeur |
|---|---|
| Date et heure | |
| Personne responsable | |
| Commit Git | |
| Migration | |
| Sauvegarde vérifiée | Oui / Non |
| Assertions réussies | Oui / Non |
| Résultat | |
| Retour arrière nécessaire | Oui / Non |

## Incident

En cas de problème :

1. limiter ou arrêter les écritures;
2. ne pas supprimer les preuves ou journaux;
3. noter l'heure et les opérations effectuées;
4. déterminer si un retour arrière de code suffit;
5. restaurer la base uniquement si les données l'exigent;
6. vérifier RLS et les parcours critiques;
7. documenter la cause et ajouter un test empêchant la récidive.

## Références officielles

- [Sauvegardes Supabase](https://supabase.com/docs/guides/platform/backups)
- [Développement local et migrations](https://supabase.com/docs/guides/local-development)
- [CLI Supabase](https://supabase.com/docs/reference/cli/introduction)

# Supabase dans Fragmenta

Ce dossier contient les changements versionnés de la base et leurs vérifications.

## Organisation

- `migrations/` : modifications SQL ordonnées par date;
- `tests/` : assertions à exécuter après les migrations;
- `../docs/SUPABASE_SECURITY_AUDIT.md` : résultats du premier audit;
- `../docs/SUPABASE_OPERATIONS.md` : sauvegardes, restauration et déploiement.

## Règles

- Une migration déjà appliquée ne doit pas être réécrite.
- Toute correction doit être placée dans une nouvelle migration horodatée.
- Une migration doit fonctionner dans une transaction lorsque PostgreSQL le permet.
- Les politiques RLS doivent être testées avec des rôles non administrateurs.
- Aucun export de données, mot de passe ou secret ne doit entrer dans Git.
- La production est toujours déployée après un environnement de développement.

## Vérification actuelle

Après la migration `20260720221500_harden_rls_and_storage.sql`, exécuter :

```sql
-- Contenu de supabase/tests/security_assertions.sql
```

Le résultat attendu est :

```text
Toutes les assertions de sécurité Fragmenta sont valides.
```

## Prochaine étape de structuration

Lorsque la CLI Supabase est installée et liée au projet de développement, générer un état initial du schéma `public`, le relire pour retirer tout secret ou propriétaire spécifique, puis l'utiliser uniquement pour reconstruire un nouvel environnement. L'état réel de production reste géré par les migrations déjà appliquées et leur historique.

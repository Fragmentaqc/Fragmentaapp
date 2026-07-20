# Audit de sécurité Supabase

**Date :** 20 juillet 2026  
**Périmètre :** tables publiques, politiques RLS, contraintes, index et buckets Storage

## Résultat

Les cinq tables applicatives ont RLS activé. Les politiques de propriété sont présentes, mais l'audit a identifié plusieurs contournements ou incohérences nécessitant un correctif.

## Risques corrigés

### Lecture des aventures privées

Deux politiques de lecture coexistent sur `adventures`. La politique `Everyone can view adventures` utilise `true` et annule donc la protection de visibilité fournie par `Public adventures are readable`.

Le correctif retire la politique trop permissive. Une aventure devient lisible uniquement si elle est publique ou si l'utilisateur connecté en est propriétaire.

### Escalade de privilèges dans les profils

La politique RLS limite les modifications à la bonne ligne, mais elle ne limite pas les colonnes. Un utilisateur pouvait donc tenter de modifier ses champs `identity_status`, `premium_status`, `identity_verified_at` ou `stripe_verification_session_id`.

Le correctif applique des permissions par colonne. L'application cliente peut uniquement lire et modifier les champs publics du profil.

### Auto-vérification des curiosités

Un propriétaire pouvait modifier toutes les colonnes de sa curiosité, y compris `verification_status`, et donc s'attribuer un statut vérifié.

Le correctif réserve cette colonne au futur processus de modération et laisse le propriétaire gérer uniquement le contenu et le statut de publication.

Le rattachement à une aventure est également limité aux aventures appartenant au même utilisateur.

### Images associées à une autre aventure

L'ancienne politique de `adventure_images` vérifiait seulement `owner_id`. Elle ne vérifiait pas que l'aventure référencée appartenait au même utilisateur.

Le correctif vérifie le propriétaire de l'aventure et exige un chemin Storage sous `utilisateur/aventure/`.

### Buckets Storage incohérents

- `adventure-images` autorisait `image/jpg`, alors que l'application envoie `image/jpeg`;
- `avatars` contenait le type invalide `image/png.`;
- `curiosity-images` n'avait aucune limite de taille ni liste de types autorisés.

Le correctif limite les images d'aventure et de curiosité à 10 Mo, les avatars à 5 Mo, et autorise seulement les formats utilisés par l'application.

## Points restant à traiter

- créer les rôles applicatifs de modérateur et d'administrateur;
- déplacer les informations sensibles de vérification/paiement dans une table privée;
- tester les politiques avec des comptes distincts;
- ajouter une procédure de sauvegarde et de restauration;
- versionner progressivement le schéma complet existant.

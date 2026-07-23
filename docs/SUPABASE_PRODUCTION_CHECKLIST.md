# Checklist de production Supabase — Fragmenta

Cette liste doit être complétée dans le projet Supabase de production avant d'appliquer les migrations. Ne jamais inscrire de clé ou de mot de passe dans ce document.

## 1. Accès administratifs

- [ ] MFA activée sur chaque compte Supabase ayant accès au projet.
- [ ] 2FA activée sur GitHub pour chaque administrateur utilisant GitHub comme connexion.
- [ ] MFA obligatoire au niveau de l'organisation Supabase si le forfait le permet.
- [ ] Au moins deux propriétaires fiables dans **Organization → Team**.
- [ ] Aucun ancien employé ni compte partagé dans l'organisation.

## 2. Authentification des utilisateurs

Dans **Authentication** :

- [ ] Confirmation du courriel activée.
- [ ] Longueur minimale du mot de passe réglée à 8 caractères ou plus.
- [ ] Exigence de chiffres, minuscules, majuscules et symboles activée si compatible avec l'expérience souhaitée.
- [ ] Protection contre les mots de passe compromis activée si disponible sur le forfait.
- [ ] Expiration des OTP réglée à 3 600 secondes maximum.
- [ ] Limites d'inscription, connexion, récupération et OTP vérifiées dans **Rate Limits**.
- [ ] CAPTCHA activé sur inscription, connexion et récupération avant une ouverture publique importante.
- [ ] SMTP personnalisé configuré; suivi des liens désactivé chez le fournisseur.
- [ ] URL `fragmenta54://reset-password` autorisée dans **URL Configuration**.
- [ ] URL du site de production exacte; aucune URL de test inutile autorisée.

## 3. Base de données

Dans **Database → Settings** et les conseillers :

- [ ] **SSL Enforcement** activé.
- [ ] **Network Restrictions** limitées aux adresses administratives nécessaires lorsque possible.
- [ ] Mot de passe de base fort et conservé uniquement dans un gestionnaire de secrets.
- [ ] **Security Advisor** sans alerte critique non justifiée.
- [ ] **Performance Advisor** examiné avant lancement.
- [ ] RLS activée sur toutes les tables applicatives.
- [ ] Aucune table sensible ajoutée à une publication Realtime publique.

Les restrictions réseau protègent les connexions PostgreSQL directes et le pooler; elles ne remplacent pas RLS pour les API HTTPS utilisées par l'application.

## 4. API, Storage et Realtime

- [ ] Seule la clé publishable est intégrée à l'application.
- [ ] Aucune clé `service_role` dans Expo, Git, les journaux ou une variable `EXPO_PUBLIC_`.
- [ ] Buckets de contenu privés après les migrations.
- [ ] Avatars et couvertures publics acceptés explicitement comme choix produit.
- [ ] Limites de taille et types MIME vérifiés dans Storage.
- [ ] Canaux de messages configurés en Realtime privé.
- [ ] Réplication limitée aux tables réellement nécessaires.

## 5. Sauvegardes et migrations

- [ ] Dernière sauvegarde Supabase réussie et rétention connue.
- [ ] Sauvegarde logique créée et vérifiée avant migration.
- [ ] Fichiers Storage sauvegardés séparément.
- [ ] Restauration testée dans une base isolée.
- [ ] Migrations appliquées d'abord en développement ou staging.
- [ ] `supabase/tests/security_assertions.sql` réussi après migration.
- [ ] Parcours connexion, profil, images, messages, modération, export et suppression testés.

## 6. Autorisation de mise en production

| Contrôle | Responsable | Date | Résultat |
|---|---|---|---|
| Sauvegarde vérifiée | | | |
| Migrations staging | | | |
| Assertions sécurité | | | |
| Tests fonctionnels | | | |
| Security Advisor | | | |
| Approbation production | | | |

La mise en production est refusée si une case des sections 1 à 5 reste inconnue. Une exception doit être documentée avec son risque, sa durée et la personne qui l'autorise.

# Fragmenta

Fragmenta est une application Expo/React Native permettant de documenter des aventures, de publier des fragments chronologiques et de partager des curiosités géolocalisées avec la communauté.

## Prérequis

- Node.js 20
- npm
- un projet Supabase configuré
- Expo Go ou un environnement Android/iOS

## Installation

1. Installer les dépendances :

   ```bash
   npm ci
   ```

2. Créer le fichier d'environnement local :

   ```bash
   cp .env.example .env
   ```

   Sous PowerShell :

   ```powershell
   Copy-Item .env.example .env
   ```

3. Remplacer les valeurs d'exemple dans `.env` :

   ```dotenv
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

   Utiliser uniquement la clé publique/publishable. Une clé `service_role` ne doit jamais être incluse dans une application cliente.

4. Démarrer Expo :

   ```bash
   npm start
   ```

## Commandes

| Commande | Utilisation |
|---|---|
| `npm start` | Démarrer Expo |
| `npm run android` | Ouvrir le projet sur Android |
| `npm run ios` | Ouvrir le projet sur iOS |
| `npm run web` | Ouvrir la version Web |
| `npm run lint` | Vérifier les règles ESLint |
| `npm run typecheck` | Vérifier les types TypeScript |
| `npm test` | Exécuter les tests unitaires |

## Structure principale

- `app/` : écrans et routes Expo Router
- `components/` : composants partagés
- `context/` : état global et accès aux données
- `lib/` : services externes, dont Supabase
- `assets/` : images et ressources visuelles
- `docs/` : documentation produit et technique

## Variables d'environnement

Les variables préfixées par `EXPO_PUBLIC_` sont intégrées au code client par Expo. Elles ne doivent donc contenir aucun secret. Les accès aux données doivent être protégés par les politiques Row Level Security de Supabase.

Le fichier `.env` est ignoré par Git. Le fichier `.env.example` documente uniquement les noms et formats attendus.

## Qualité

GitHub Actions exécute automatiquement les commandes suivantes sur chaque pull request et chaque ajout à `main` :

```bash
npm ci
npm run lint
npm run typecheck
npm test
```

Les quatre contrôles doivent réussir avant la fusion d'une pull request.

## Documentation Expo

Ce projet utilise Expo SDK 54. Les changements doivent respecter la [documentation Expo 54](https://docs.expo.dev/versions/v54.0.0/).

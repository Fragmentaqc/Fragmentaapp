# Récupération de compte

Fragmenta utilise Supabase Auth et le lien profond `fragmenta54://reset-password` pour la réinitialisation du mot de passe.

Dans Supabase, ouvrir **Authentication → URL Configuration** et ajouter cette adresse à la liste des URL de redirection autorisées :

```text
fragmenta54://reset-password
```

Le parcours est le suivant :

1. L’utilisateur demande un lien depuis « Mot de passe oublié ».
2. Supabase envoie le courriel sans révéler si un compte existe.
3. Le lien ouvre `reset-password` dans l’application.
4. Fragmenta échange le code ou les jetons contre une session de récupération.
5. L’utilisateur choisit un mot de passe d’au moins huit caractères.

Le profil affiche aussi si le courriel est confirmé et permet de renvoyer le courriel de confirmation.

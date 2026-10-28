# Guide de modification ? Tsarakaly

## O? modifier le site

- `index.html` contient le document HTML de d?part et les points o? l'application s'affiche.
- `src/app.js` gère l’état, la navigation, les formulaires et les interactions.
- `src/views.js` construit le HTML des pages, de l’en-tête et du pied de page.
- `src/data.js` centralise les textes de marque, coordonn?es, horaires, cr?neaux, plats, photos et galerie.
- `src/styles.css` contient les styles et les r?gles pour mobile. Les couleurs sont d?finies en variables CSS au d?but du fichier.
- `src/lib/` contient les fonctions de dates, r?servation, menu et connexion Supabase.
- `supabase/migrations/` contient la d?finition de la base et ses r?gles d'acc?s.

## Modifier les informations

En mode d?mo, modifiez l'objet `restaurant`, la liste `demoMenu`, `siteImages` ou `gallery` dans `src/data.js`. Les cl?s `openingHours` vont de `0` (dimanche) ? `6` (samedi), avec les horaires au format `HH:MM`. `closedDays` contient les jours ferm?s.

Avec Supabase configur?, `restaurant_settings` fournit les informations publiques. Le RPC `create_reservation` v?rifie aussi les r?gles de r?servation c?t? base.

## Commandes

```sh
npm run dev
npm run test
npm run build
```

Vite est conserv? pour le serveur local, le build statique et l'injection des variables d'environnement Supabase. L'interface n'utilise plus React ni TypeScript.

# Guide de modification — Tsarakaly

## Où modifier le site

- `index.html` : document HTML de départ et liens vers les styles et le script principal.
- `src/app.js` : état de l’application, navigation, chargement des données et interactions.
- `src/views.js` : affichage HTML de l’accueil, du menu, de la galerie, des formulaires et de l’administration.
- `src/data.js` : identité du restaurant, horaires, plats, images et galerie de démonstration.
- `src/styles.css` : couleurs, mise en page, composants et règles pour mobile.
- `src/lib/dates.js` : calcul des dates et jours de semaine.
- `src/lib/menu.js` : chargement et filtrage de la carte.
- `src/lib/reservations.js` : validation et enregistrement des demandes de réservation.
- `src/lib/supabase.js` : connexion facultative à Supabase.
- `supabase/migrations/` : tables, fonctions et règles d’accès de la base.
- `public/` : images et fichiers statiques. Dans `src/data.js`, utilisez un chemin comme `/images/ravitoto.jpg` pour un fichier placé dans `public/images/ravitoto.jpg`.

## Modifier les informations du restaurant

En mode démonstration, modifiez l’objet `restaurant`, la liste `demoMenu`, l’objet `siteImages` ou la liste `gallery` dans `src/data.js`. Les jours de la semaine utilisent les nombres JavaScript : `0` pour dimanche et `6` pour samedi. Les créneaux sont au format `HH:MM`.

Avec Supabase configuré, les paramètres publics et la carte proviennent de la base. Les réservations passent par la fonction SQL `create_reservation`, qui vérifie les horaires, la capacité et les jours de fermeture avant l’enregistrement.

## Commandes utiles

```sh
npm run dev
npm test
npm run build
```

Vite fournit le serveur local et construit la version statique. Vitest exécute les tests des règles de dates, de réservation et de filtrage de la carte.

# Tsarakaly

Site de restaurant construit avec JavaScript, HTML et CSS natifs. Vite sert le site en local et produit les fichiers de publication. Supabase est facultatif : sans ses variables d’environnement, le site utilise les données de démonstration définies dans `src/data.js`.

## Démarrer le site

```sh
npm install
npm run dev
```

Pour créer la version de publication et lancer les tests :

```sh
npm run build
npm test
```

## Organisation du code

- `index.html` fournit le document de départ et les emplacements de l’en-tête, des pages et du pied de page.
- `src/app.js` coordonne la navigation, l’état de l’application, les formulaires et les interactions.
- `src/views.js` produit le HTML des pages à partir de l’état et des données.
- `src/data.js` contient les données de démonstration du restaurant, de la carte et de la galerie.
- `src/styles.css` contient les styles du site et les adaptations aux écrans mobiles.
- `src/lib/` regroupe les fonctions liées aux dates, à la carte, aux réservations et à Supabase.
- `supabase/migrations/` contient le schéma de base de données et ses règles d’accès.
- `public/` contient les images et autres fichiers statiques servis tels quels.

Le parcours des données est simple : `app.js` charge la carte avec `src/lib/menu.js`, puis passe l’état à `src/views.js` pour afficher la page. Les règles de réservation sont dans `src/lib/reservations.js`; la base les vérifie aussi côté serveur avec la fonction SQL `create_reservation`.

## Configurer Supabase

1. Copiez `.env.example` vers `.env.local`.
2. Renseignez `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`. N’utilisez jamais une clé `service_role` dans une variable `VITE_`.
3. Appliquez `supabase/migrations/202610190001_initial_schema.sql` avec Supabase CLI ou l’éditeur SQL.
4. Créez un compte Auth, puis accordez-lui le rôle `admin` après vérification de son UUID.
5. Renseignez les paramètres du restaurant, les catégories et les plats avant publication.

Les demandes en ligne sont enregistrées avec le statut « en attente » et doivent être confirmées par le restaurant. Le projet n’envoie pas de courriel de confirmation. Sans Supabase configuré, les réservations en ligne sont désactivées.

## Avant publication

Vérifiez les coordonnées, les plats, les prix, les images et les règles RLS. Complétez aussi les mentions légales et la politique de confidentialité. Vercel redirige les URL des pages vers `index.html` grâce à `vercel.json`.

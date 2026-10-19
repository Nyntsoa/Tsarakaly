# Tsarakaly — site de restaurant

Site React en français pour un restaurant gastronomique de saison. L’identité, les plats, prix, coordonnées et horaires montrés sans configuration sont des **données de démonstration fictives**. Les images distantes sont des images d’ambiance provisoires, pas des photos du restaurant.

## Technologies

- React 19, TypeScript strict, Vite 7 et Tailwind CSS 4
- React Router, Lucide, React Hook Form et Zod
- Supabase Auth, PostgreSQL et Row Level Security (optionnels en développement)
- Vercel avec réécriture SPA

## Prérequis et démarrage local

Node.js 22 ou supérieur et npm sont recommandés.

```sh
npm install
npm run dev
```

Ouvrir l’URL locale affichée par Vite. Sans variables Supabase, le site démarre en mode démo : le menu est fourni par `src/data.ts`, les filtres et validations sont actifs, mais aucune réservation n’est conservée. Le formulaire contact reste désactivé tant qu’un vrai courriel n’est pas renseigné.

## Personnaliser la démonstration

- Marque, coordonnées, devise, horaires de présentation et limite de convives : `src/data.ts` (`restaurant`). Les valeurs actuelles sont fictives et doivent être remplacées.
- Plats, prix, allergènes, disponibilité et catégories : `demoMenu` dans `src/data.ts`.
- Photos : remplacer les URL dans `src/data.ts` et les compositions de `src/App.tsx` par les photos du lieu et des plats. Les images provisoires viennent de `picsum.photos` (images Unsplash servies par Picsum), nécessitent une connexion et ne représentent pas le restaurant. Les crédits des photographes sont affichés en pied de page. Un repli typographique apparaît si une image ne charge pas.
- Styles visuels : variables de couleur et règles dans `src/styles.css`.

## Configurer Supabase

1. Créer un projet Supabase, puis copier `.env.example` vers `.env.local`.
2. Renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (clé publique/anon uniquement). Ne jamais placer `service_role` ou un secret serveur dans une variable `VITE_`.
3. Appliquer `supabase/migrations/202610190001_initial_schema.sql` via le SQL Editor Supabase ou Supabase CLI :

   ```sh
   supabase db push
   ```

4. Créer un utilisateur depuis Supabase Auth. Les nouveaux profils sont créés avec le rôle `customer`.
5. Après avoir vérifié l’identité du compte, attribuer son rôle depuis le SQL Editor, avec son UUID Auth :

   ```sql
   update public.profiles set role = 'admin'
   where id = 'UUID_AUTH_DU_COMPTE';
   ```

   Aucun utilisateur ne peut modifier son rôle via le site. N’accordez ce rôle qu’à un compte que vous contrôlez.
6. Ajouter/modifier catégories et plats depuis `/admin`. Les paramètres du restaurant sont dans `restaurant_settings`. Les horaires de réservation sont un objet JSON dont les clés sont les jours de semaine (0 dimanche à 6 samedi) et les valeurs des listes de créneaux `HH:MM`. `closed_days` contient les jours fermés. Le RPC `create_reservation` vérifie l’heure, la date, le jour fermé, la limite de groupe et la capacité par créneau, puis crée une demande `pending`.
7. Les réservations ne sont lisibles que par un administrateur. Les clients peuvent seulement envoyer via le RPC sécurisé; il n’existe pas de lecture publique des coordonnées ni demandes particulières. Une demande n’est pas confirmée tant que l’administrateur ne change pas son statut.

Les valeurs publiques de paramètres doivent être réelles avant lancement. Les informations administrateur et l’adresse e-mail ne sont pas préremplies. Aucun courriel de confirmation n’est envoyé.

## Tests et compilation

```sh
npm run test
npm run lint
npm run build
```

Les tests unitaires vérifient les validations de réservation. Le projet ne contient pas encore de suite navigateur Playwright ni de tests d’intégration contre un projet Supabase : configurez un projet de test séparé avant de valider les flux réels et les politiques RLS.

## Déploiement Vercel

1. Importer le dépôt dans Vercel et conserver le preset Vite.
2. Ajouter `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans les variables d’environnement du projet si Supabase est utilisé.
3. Exécuter les migrations sur le projet Supabase cible; ne mettez aucune clé privée dans Vercel côté client.
4. Déployer. `vercel.json` renvoie les routes React vers `index.html`.
5. Vérifier chaque route, les coordonnées, la politique de confidentialité, les images, les créneaux horaires, le compte administrateur et la réservation test avant publication.

## Arborescence principale

```text
src/                 pages, navigation, composants et styles
src/data.ts          configuration fictive et menu de démonstration centralisé
src/lib/             client Supabase, services et validation métier
supabase/migrations/ schéma SQL et politiques RLS
.env.example         noms des variables publiques nécessaires
```

## Limites à lever avant une mise en production

- Remplacer toutes les données et photos d’exemple. Le site ne doit pas présenter l’adresse ou les plats fictifs comme des faits.
- Le contact ouvre l’application e-mail de la personne seulement après configuration d’une adresse valide; aucun service d’envoi n’est inclus.
- Le système n’envoie pas de courriels, et un statut `pending` n’est pas une confirmation.
- Vérifier la procédure de sauvegarde, la sécurité et le dimensionnement de capacité selon le fonctionnement réel du restaurant. Utiliser un projet Supabase de test pour la recette.
- Compléter les mentions légales et la politique de confidentialité avec l’entité et les durées de conservation réelles.

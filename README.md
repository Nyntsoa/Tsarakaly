# Tsarakaly ? site de restaurant

Site de restaurant construit en HTML, CSS et JavaScript natifs. `index.html` est le point d’entrée; `src/app.js` gère la navigation et les interactions, tandis que `src/views.js` construit les pages. Vite sert le site en développement et injecte les variables publiques Supabase à la compilation. Sans configuration, le contenu affiché est un exemple.

## D?marrer

Node.js 22+ et npm sont recommand?s.

```sh
npm install
npm run dev
```

Sans variables Supabase, la carte utilise `src/data.js` et les demandes de r?servation ne sont pas conserv?es. Le formulaire de contact ouvre l'application e-mail seulement si `restaurant.email` est configur?.

## Modifier le site

- `src/data.js` : nom, coordonn?es, horaires, cr?neaux, plats, images et galerie.
- `src/styles.css` : couleurs, styles des pages et adaptations mobiles.
- `src/app.js` : état de l’application, navigation et interactions.
- `src/views.js` : HTML des pages, de l’en-tête et du pied de page.
- `src/lib/` : services Supabase, menu, dates et r?servations.
- `supabase/migrations/` : sch?ma SQL et politiques d'acc?s.

## Configurer Supabase

1. Copier `.env.example` vers `.env.local`.
2. Renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (cl? publique uniquement). Ne jamais placer une cl? `service_role` dans une variable `VITE_`.
3. Appliquer `supabase/migrations/202610190001_initial_schema.sql` avec Supabase CLI ou le SQL Editor.
4. Cr?er un compte Supabase Auth, puis lui accorder le r?le `admin` depuis le SQL Editor apr?s v?rification de son UUID.
5. Configurer `restaurant_settings`, les plats et cat?gories avant publication. Le RPC `create_reservation` valide les horaires et la capacit?, puis cr?e une demande `pending`.

Les r?servations sont accessibles uniquement aux administrateurs. Le site n'envoie aucun courriel de confirmation. Une demande `pending` n'est pas une r?servation confirm?e.

## V?rification et publication

```sh
npm run test
npm run build
```

Les tests Vitest couvrent les filtres de carte et les r?gles de dates/r?servation. Aucun test d'int?gration Supabase n'est configur?. Vercel utilise `vercel.json` pour renvoyer les URL des pages vers `index.html`.

Avant la mise en ligne, remplacez les coordonn?es, plats, prix et photos fictifs, v?rifiez les r?gles RLS et compl?tez les mentions l?gales et la politique de confidentialit?.

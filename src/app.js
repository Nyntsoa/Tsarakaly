import {
  categories,
  demoMenu,
  gallery,
  restaurant,
  siteImages,
} from './data.js'
import { filterMenu, loadMenu } from './lib/menu.js'
import { createReservation, validateReservation } from './lib/reservations.js'
import { getTodayInTimezone, getWeekday } from './lib/dates.js'
import { isSupabaseConfigured, supabase } from './lib/supabase.js'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const app = document.querySelector('#app')
const header = document.querySelector('#site-header')
const footer = document.querySelector('#site-footer')
let pageMotion

const state = {
  menu: demoMenu,
  menuLoading: true,
  menuError: '',
  selectedCategory: 'Tous les plats',
  activePhoto: null,
  session: null,
  adminReady: false,
  adminError: '',
  adminTab: 'menu',
  adminItems: [],
  adminCategories: [],
  reservations: [],
  restaurantError: false,
}

const iconPaths = {
  arrowRight: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  arrowDown: '<path d="M12 5v14m7-7-7 7-7-7"/>',
  arrowLeft: '<path d="M19 12H5m7 7-7-7 7-7"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  map: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  phone:
    '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.5 3a2 2 0 0 1-.6 1.7L7.1 10.3a16 16 0 0 0 6 6l1.9-1.9a2 2 0 0 1 1.7-.6l3 .5a2 2 0 0 1 1.7 2.6Z"/>',
  close: '<path d="m18 6-12 12M6 6l12 12"/>',
}

function icon(name, size = 18) {
  return `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${iconPaths[name] ?? ''}</svg>`
}

function escapeHtml(value = '') {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character],
  )
}

function photo(src, alt, className = '', priority = false) {
  const loading = priority ? 'eager' : 'lazy'
  const fetchPriority = priority ? 'high' : 'auto'
  return `<img class="${className}" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="${loading}" fetchpriority="${fetchPriority}" onerror="imageFallback(this)">`
}

window.imageFallback = (image) => {
  const replacement = document.createElement('div')
  replacement.className = `photo-fallback ${image.className}`
  replacement.setAttribute('role', 'img')
  replacement.setAttribute('aria-label', image.alt)
  replacement.innerHTML = `<span>${escapeHtml(restaurant.name)}</span>`
  image.replaceWith(replacement)
}

function pageHead(label, title, text) {
  return `<div class="page-head"><span class="page-label">${escapeHtml(label)}</span><h1>${escapeHtml(title)}</h1><p class="page-lead">${escapeHtml(text)}</p></div>`
}

function dishCard(dish, index = 0) {
  const price = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: restaurant.currency,
    maximumFractionDigits: 0,
  }).format(dish.price)
  const labels = (dish.labels ?? [])
    .map((label) => `<span>${escapeHtml(label)}</span>`)
    .join('')
  const allergens = dish.allergens?.length
    ? `<span>Allergènes : ${escapeHtml(dish.allergens.join(', '))}</span>`
    : ''

  return `<article class="dish dish-${index + 1}">
    <div class="dish-photo">${photo(dish.image_url, `Illustration du plat : ${dish.name}`)}</div>
    <div class="dish-copy"><h3>${escapeHtml(dish.name)}</h3><p>${escapeHtml(dish.description)}</p>
      <div class="dish-meta"><span>${escapeHtml(dish.category)}</span>${labels}${allergens}<span>${price}</span></div>
    </div>
  </article>`
}

function sectionTitle(title, aside = '') {
  return `<div class="section-title"><h2>${title}</h2>${aside ? `<p>${aside}</p>` : ''}</div>`
}

function renderHeader() {
  header.className = 'site-header'
  const active = (path) => (window.location.pathname === path ? 'active' : '')
  header.innerHTML = `<span class="wordmark">${escapeHtml(restaurant.name)}</span>
    <button class="mobile-toggle" aria-label="Ouvrir le menu" aria-expanded="false" data-menu-toggle>${icon('menu')}</button>
    <nav class="main-nav" aria-label="Navigation principale">
      <a href="/" data-route class="${active('/')}">Accueil</a><a href="/histoire" data-route class="${active('/histoire')}">Histoire</a><a href="/menu" data-route class="${active('/menu')}">Menu</a><a href="/galerie" data-route class="${active('/galerie')}">Galerie</a><a href="/contact" data-route class="${active('/contact')}">Contact</a>
      <a class="button button-dark nav-book" href="/reservation" data-route>Réserver une table ${icon('arrowRight', 15)}</a>
    </nav>`
}

function renderFooter() {
  footer.className = 'site-footer'
  footer.innerHTML = `<div class="footer-top"><div><span class="footer-brand">${escapeHtml(restaurant.name)}</span><p>${escapeHtml(restaurant.tagline)}</p></div>
    <div class="footer-links"><div><span>Explorer</span><a href="/histoire" data-route>Notre histoire</a><a href="/menu" data-route>Le menu</a><a href="/galerie" data-route>La galerie</a></div>
    <div><span>Nous trouver</span><p>${escapeHtml(restaurant.address)}</p>${restaurant.phone ? `<a href="tel:${escapeHtml(restaurant.phone)}">${escapeHtml(restaurant.phone)}</a>` : ''}${restaurant.email ? `<a href="mailto:${escapeHtml(restaurant.email)}">${escapeHtml(restaurant.email)}</a>` : ''}</div>
    <div><span>Informations</span><a href="/contact" data-route>Contact</a><a href="/mentions-legales" data-route>Mentions légales</a><a href="/confidentialite" data-route>Confidentialité</a></div></div></div>
    <div class="footer-bottom"><span>© ${new Date().getFullYear()} ${escapeHtml(restaurant.name)}</span><span>${escapeHtml(restaurant.tagline)}</span></div>
    <p class="photo-credits">Photographies : <a href="https://unsplash.com/photos/DEdM9Vs6s8w" target="_blank" rel="noreferrer">Breather</a>, <a href="https://unsplash.com/photos/JYFmYif4n70" target="_blank" rel="noreferrer">Dominik Martin</a>, <a href="https://unsplash.com/photos/hv1MrBzGGNY" target="_blank" rel="noreferrer">Webvilla</a>, <a href="https://unsplash.com/photos/hGO27G5tZJ8" target="_blank" rel="noreferrer">Vee O</a>, <a href="https://unsplash.com/photos/lQy6mHZ7fYk" target="_blank" rel="noreferrer">Monstruo Estudio</a>, <a href="https://unsplash.com/photos/pJILiyPdrXI" target="_blank" rel="noreferrer">Ben Moore</a>, <a href="https://unsplash.com/photos/TYIzeCiZ_60" target="_blank" rel="noreferrer">Karl Fredrickson</a>, <a href="https://unsplash.com/photos/NYxxuBSQzp4" target="_blank" rel="noreferrer">Martin Wessely</a>.</p>`
  fitFooterBrand()
}

function fitFooterBrand() {
  const brand = footer.querySelector('.footer-brand')
  const column = brand?.parentElement
  if (!(brand instanceof HTMLElement) || !(column instanceof HTMLElement)) return

  // Measure the real text width so long restaurant names fit too.
  brand.style.fontSize = ''
  const range = document.createRange()
  range.selectNodeContents(brand)
  const textWidth = range.getBoundingClientRect().width
  const baseFontSize = Number.parseFloat(getComputedStyle(brand).fontSize)
  const availableWidth = column.clientWidth * 0.8

  if (textWidth > availableWidth && textWidth > 0) {
    brand.style.fontSize = `${baseFontSize * (availableWidth / textWidth)}px`
  }
}

window.addEventListener('resize', fitFooterBrand)
if (document.fonts?.ready) {
  void document.fonts.ready.then(fitFooterBrand)
}

function renderPractical() {
  return `<section class="practical section-pad"><div><h2>Nous serons heureux<br>de vous accueillir.</h2><p>${escapeHtml(restaurant.address)}</p>${restaurant.phone ? `<a href="tel:${escapeHtml(restaurant.phone)}">${escapeHtml(restaurant.phone)}</a>` : ''}${restaurant.email ? `<a href="mailto:${escapeHtml(restaurant.email)}">${escapeHtml(restaurant.email)}</a>` : ''}</div>
    <div class="hours"><h3>Horaires</h3>${restaurant.hours.map(([day, hours]) => `<div><span>${escapeHtml(day)}</span><span>${escapeHtml(hours)}</span></div>`).join('')}</div>
    <div class="practical-links"><a href="/contact" data-route>Nous contacter ${icon('arrowRight', 16)}</a><a href="/reservation" data-route>Réserver une table ${icon('arrowRight', 16)}</a></div></section>`
}

function renderHome() {
  const selection = state.menuError
    ? '<p role="alert" class="state-message error-message">La sélection du chef ne peut pas être chargée pour le moment.</p>'
    : state.menuLoading
      ? '<p role="status" class="state-message">Chargement de la carte…</p>'
      : state.menu.length
        ? state.menu.slice(0, 3).map(dishCard).join('')
        : '<p class="state-message">La carte du moment sera bientôt disponible.</p>'

  return `<main><section class="hero"><div class="hero-image">${photo(siteImages.hero, 'Illustration d’ambiance : une table baignée de lumière', '', true)}<div class="hero-overlay"></div><h1 class="hero-wordmark"><span>${escapeHtml(restaurant.name)}</span></h1></div>
    <div class="hero-bottom"><p>${escapeHtml(restaurant.description)}</p><div class="hero-actions"><a class="button button-dark" href="/menu" data-route>Découvrir le menu ${icon('arrowRight', 16)}</a><a class="button button-outline" href="/reservation" data-route>Réserver une table</a></div><a class="scroll-cue" href="#histoire" aria-label="Défiler vers notre histoire">${icon('arrowDown')}</a></div></section>
    <section id="histoire" class="intro-section section-pad"><div class="intro-image">${photo(siteImages.introduction, 'Illustration d’ambiance culinaire : assiette lumineuse')}</div><div class="intro-copy"><h2><span class="desktop-heading">Une cuisine qui raconte une histoire.</span><span class="mobile-heading">Une cuisine de saison.</span></h2><p>Des produits choisis avec attention, des gestes précis et une carte qui évolue au fil des saisons. Chez ${escapeHtml(restaurant.name)}, chaque assiette laisse le produit s’exprimer.</p><a class="text-link" href="/histoire" data-route>Découvrir notre histoire ${icon('arrowRight', 16)}</a></div></section>
    <section class="selection-section section-pad">${sectionTitle('La sélection du moment', 'Des produits choisis au fil des arrivages.')}<div class="dish-grid">${selection}</div><div class="center-action"><a class="button button-outline" href="/menu" data-route>Voir toute la carte ${icon('arrowRight', 16)}</a></div></section>
    <section class="experience-section"><div class="experience-photo">${photo(siteImages.experience, 'Illustration d’ambiance : lumière naturelle sur une table')}</div><div class="experience-copy"><h2>Le plaisir de ralentir.</h2><p>Une salle accueillante, une cuisine attentive et le temps de partager. Nous imaginons chaque service comme une parenthèse simple et généreuse.</p><a class="button button-cream" href="/reservation" data-route>Trouver ma table ${icon('arrowRight', 16)}</a></div></section>
    <section class="gallery-preview section-pad">${sectionTitle('Autour de la table', 'L’esprit de la maison, jusque dans les détails.')}<div class="preview-grid">${[0, 2, 4].map((index, position) => `<a href="/galerie" data-route class="${position === 0 ? 'preview-large' : `preview-small ${position === 2 ? 'second' : ''}`}">${photo(gallery[index].src, gallery[index].alt)}<span>${escapeHtml(gallery[index].caption)}</span></a>`).join('')}</div><a class="text-link gallery-link" href="/galerie" data-route>Voir la galerie ${icon('arrowRight', 16)}</a></section>
    <section class="reservation-banner"><h2>Votre prochaine belle table vous attend.</h2><a class="button button-cream" href="/reservation" data-route>Réserver une table ${icon('arrowRight', 16)}</a></section>${renderPractical()}</main>`
}

function renderStory() {
  return `<main class="subpage"><div>${pageHead('Notre histoire', 'Le goût des choses justes.', 'Une cuisine de saison, pensée autour des produits et du plaisir d’être ensemble.')}</div>
    <div class="story-lead">${photo(siteImages.story, 'Illustration d’ambiance : salle lumineuse et table dressée')}<p>« Une belle assiette commence par un bon produit, et se partage sans façon. »</p></div>
    <section class="story-columns section-pad"><div><h2>Au rythme des saisons</h2><p>La carte suit le marché. Nous privilégions les récoltes du moment et faisons évoluer les assiettes au fil de l’année, sans figer une recette qui a déjà vécu.</p></div><div><h2>Le geste et le produit</h2><p>La cuisine reste lisible : une cuisson juste, des associations choisies et des préparations faites avec soin. Le produit garde sa place au centre.</p></div><div><h2>Une table à partager</h2><p>${escapeHtml(restaurant.name)} est imaginé comme un lieu où l’on se retrouve, pour un déjeuner qui s’étire ou un dîner célébré à plusieurs.</p></div></section>
    <section class="story-wide">${photo(siteImages.storyDetail, 'Illustration d’ambiance : composition d’assiette lumineuse')}<div><h2>Du premier accueil au dernier café.</h2><p>Une attention discrète, une cuisine généreuse et une atmosphère chaleureuse composent l’expérience que nous souhaitons offrir.</p></div></section><section class="subpage-cta"><h2>Une place à votre table ?</h2><a class="button button-dark" href="/reservation" data-route>Réserver ${icon('arrowRight', 16)}</a></section></main>`
}

function renderMenu() {
  const shown = filterMenu(state.menu, state.selectedCategory)
  const content = state.menuLoading
    ? '<p class="state-message" role="status">Chargement de la carte…</p>'
    : state.menuError
      ? `<p class="state-message error-message" role="alert">${escapeHtml(state.menuError)}</p>`
      : shown.length
        ? shown.map((item, index) => dishCard(item, index % 3)).join('')
        : '<p class="state-message">Aucun plat disponible dans cette catégorie pour le moment.</p>'
  return `<main class="subpage menu-page">${pageHead('À la carte', 'La carte du moment.', 'Une carte courte qui évolue au fil des saisons. Découvrez nos entrées, plats, desserts et boissons.')}${isSupabaseConfigured ? '<p class="source-note">Carte chargée depuis la base du restaurant.</p>' : ''}<div class="filter-bar" role="group" aria-label="Filtrer les plats">${categories.map((category) => `<button data-category="${escapeHtml(category)}" class="filter-button ${state.selectedCategory === category ? 'active' : ''}" aria-pressed="${state.selectedCategory === category}">${escapeHtml(category)}</button>`).join('')}</div><div class="menu-list">${content}</div><p class="allergen-note">N’hésitez pas à nous signaler vos allergies. Les allergènes ci-dessus sont indicatifs et doivent être confirmés.</p></main>`
}

function renderGallery() {
  const lightbox =
    state.activePhoto === null
      ? ''
      : `<div class="lightbox" role="dialog" aria-modal="true" aria-label="${escapeHtml(gallery[state.activePhoto].caption)}" data-lightbox><button class="lightbox-close" aria-label="Fermer" data-lightbox-close>${icon('close')}</button><button class="lightbox-prev" aria-label="Image précédente" data-lightbox-prev>${icon('arrowLeft')}</button><figure>${photo(gallery[state.activePhoto].src, gallery[state.activePhoto].alt)}<figcaption>${escapeHtml(gallery[state.activePhoto].caption)}</figcaption></figure><button class="lightbox-next" aria-label="Image suivante" data-lightbox-next>${icon('arrowRight')}</button></div>`
  return `<main class="subpage gallery-page">${pageHead('Galerie', 'Quelques instants à table.', `Une table conviviale, des assiettes inspirées par les saisons.`)}<div class="gallery-grid">${gallery.map((item, index) => `<button class="gallery-item gallery-item-${index + 1}" data-gallery-index="${index}" aria-label="Agrandir : ${escapeHtml(item.caption)}">${photo(item.src, item.alt)}<span>${escapeHtml(item.caption)}</span></button>`).join('')}</div>${lightbox}</main>`
}

function renderReservation() {
  const today = getTodayInTimezone(restaurant.timezone)
  const dates = state.reservationDate ? getWeekday(state.reservationDate) : null
  const times =
    dates === null
      ? [...new Set(Object.values(restaurant.openingHours).flat())].sort()
      : (restaurant.openingHours[String(dates)] ?? [])
  const timeOptions = times
    .map(
      (time) =>
        `<option value="${escapeHtml(time)}" ${state.reservationTime === time ? 'selected' : ''}>${escapeHtml(time)}</option>`,
    )
    .join('')
  if (state.reservationResult)
    return `<main class="subpage reservation-page">${pageHead('Réservation', 'À bientôt autour de la table.', 'Choisissez votre moment et envoyez-nous une demande.')}<div class="success-panel" role="status"><span class="success-icon">${icon('check')}</span><h2>${state.reservationResult === 'demo' ? 'Réservation indisponible' : 'Demande reçue'}</h2><p>${state.reservationResult === 'demo' ? 'La réservation en ligne est momentanément indisponible. Réessayez plus tard.' : 'Votre demande a été transmise au restaurant et attend sa confirmation.'}</p><button class="button button-dark" data-new-reservation>Faire une autre demande</button></div></main>`
  return `<main class="subpage reservation-page">${pageHead('Réservation', 'À bientôt autour de la table.', 'Choisissez votre moment et envoyez-nous une demande. En mode production, le restaurant doit confirmer votre réservation.')}<form class="booking-form" id="reservation-form" novalidate><div class="form-grid">
    ${field('Nom complet', '<input name="customer_name" autocomplete="name" required minlength="2" maxlength="100">')}${field('Adresse e-mail', '<input type="email" name="customer_email" autocomplete="email" required maxlength="254">')}${field('Téléphone', '<input type="tel" name="customer_phone" autocomplete="tel" required minlength="6" maxlength="30">')}${field('Date', `<input type="date" name="reservation_date" min="${today}" value="${escapeHtml(state.reservationDate ?? '')}" required>`)}${field('Heure', `<select name="reservation_time" required><option value="">Choisir un créneau</option>${timeOptions}</select>`)}${field('Nombre de personnes', `<select name="guest_count">${Array.from({ length: restaurant.maxPartySize }, (_, index) => `<option value="${index + 1}" ${index === 1 ? 'selected' : ''}>${index + 1} ${index === 0 ? 'personne' : 'personnes'}</option>`).join('')}</select>`)}${field('Occasion (facultatif)', '<input name="occasion" maxlength="100" placeholder="Anniversaire, déjeuner…">')}${field('Demandes particulières', '<textarea name="special_requests" rows="4" maxlength="1000" placeholder="Allergies ou détails utiles"></textarea>', true)}</div>
    <label class="privacy-check"><input type="checkbox" name="privacy" required><span>J’accepte la <a href="/confidentialite" data-route>politique de confidentialité</a>.</span></label><p class="form-note">${isSupabaseConfigured ? 'Les demandes sont enregistrées en attente de confirmation.' : 'La réservation en ligne est momentanément indisponible.'}</p><p class="form-error" role="alert" data-form-error></p><button class="button button-dark submit-button" type="submit">Envoyer ma demande ${icon('arrowRight', 16)}</button></form></main>`
}

function field(label, content, full = false) {
  return `<div class="field ${full ? 'field-full' : ''}"><label>${label}${content}</label></div>`
}

function renderContact() {
  return `<main class="subpage contact-page">${pageHead('Contact', 'Parlons de votre visite.', 'Une question ou une occasion à célébrer ? Écrivez-nous ou retrouvez nos informations pratiques.')}<div class="contact-layout"><div class="contact-details"><div>${icon('map')}<h3>Adresse</h3><p>${escapeHtml(restaurant.address)}</p></div><div>${icon('clock')}<h3>Horaires</h3>${restaurant.hours.map(([day, hours]) => `<p class="contact-hour"><span>${escapeHtml(day)}</span><span>${escapeHtml(hours)}</span></p>`).join('')}</div><div>${icon('phone')}<h3>Téléphone</h3>${restaurant.phone ? `<a href="tel:${escapeHtml(restaurant.phone)}">${escapeHtml(restaurant.phone)}</a>` : '<p>Numéro de téléphone indisponible</p>'}</div></div>
    <form class="contact-form" id="contact-form"><h2>Envoyez-nous un mot.</h2>${field('Votre nom', '<input name="name" required>')}${field('Votre e-mail', '<input type="email" name="email" required>')}${field('Objet', '<input name="subject" required>')}${field('Votre message', '<textarea name="message" rows="5" required></textarea>', true)}<p class="form-note">${restaurant.email ? 'Votre application de messagerie s’ouvrira pour envoyer le message.' : 'Le contact par e-mail n’est pas disponible actuellement.'}</p><button class="button button-dark" ${restaurant.email ? '' : 'disabled'}>Préparer le message ${icon('arrowRight', 16)}</button></form></div></main>`
}

function renderLegal(privacy = false) {
  const text = privacy
    ? 'Les coordonnées transmises lors d’une demande de réservation servent à traiter cette demande et à organiser votre venue. Pour toute question relative à vos données, contactez le restaurant via la page Contact.'
    : `Tsarakaly vous accueille à Antananarivo, Madagascar. Le site est hébergé par Vercel. Pour toute question, contactez le restaurant via la page Contact.`
  return `<main class="subpage legal-page">${pageHead(privacy ? 'Confidentialité' : 'Mentions légales', privacy ? 'Vos données, simplement.' : 'Informations légales.', 'Retrouvez ici les informations relatives au restaurant et à l’utilisation de ce site.')}<section><h2>${privacy ? 'Données de réservation' : 'Éditeur du site'}</h2><p>${escapeHtml(text)}</p></section></main>`
}

function renderNotFound() {
  return `<main class="subpage">${pageHead('404', 'Cette page n’existe pas.', 'Retrouvez le chemin vers notre table.')}<a class="button button-dark" href="/" data-route>Retour à l’accueil</a></main>`
}

function renderAdmin() {
  if (!isSupabaseConfigured) {
    return `<main class="subpage admin-wrap">${pageHead('Administration', 'Configuration requise.', 'L’espace administrateur est désactivé tant que Supabase n’est pas configuré.')}<p class="admin-hint">Ajoutez les variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY, exécutez la migration, puis attribuez le rôle admin depuis la console SQL Supabase.</p></main>`
  }
  if (!state.session) {
    return `<main class="subpage admin-wrap">${pageHead('Administration', 'Connexion sécurisée.', 'Connectez-vous avec un compte authentifié et autorisé par son profil Supabase.')}<form class="admin-login" id="admin-login"><label class="field"><span>Adresse e-mail</span><input name="email" type="email" autocomplete="username" required></label><label class="field"><span>Mot de passe</span><input name="password" type="password" autocomplete="current-password" required></label>${state.adminError ? `<p class="form-error" role="alert">${escapeHtml(state.adminError)}</p>` : ''}<button class="button button-dark">Se connecter ${icon('arrowRight', 16)}</button></form></main>`
  }
  if (state.adminError && !state.adminReady) {
    return `<main class="subpage admin-wrap">${pageHead('Administration', 'Accès non autorisé.', state.adminError)}<button class="button button-outline" data-signout>Se déconnecter</button></main>`
  }
  if (!state.adminReady) {
    return `<main class="subpage admin-wrap">${pageHead('Administration', 'Vérification des droits…', 'Chargement du profil administrateur.')}</main>`
  }

  const tabs = `<div class="admin-tabs"><button class="${state.adminTab === 'menu' ? 'active' : ''}" data-admin-tab="menu">Carte (${state.adminItems.length})</button><button class="${state.adminTab === 'reservations' ? 'active' : ''}" data-admin-tab="reservations">Réservations (${state.reservations.length})</button><button class="${state.adminTab === 'settings' ? 'active' : ''}" data-admin-tab="settings">Paramètres</button></div>`
  const panel =
    state.adminTab === 'menu'
      ? renderAdminMenu()
      : state.adminTab === 'reservations'
        ? renderAdminReservations()
        : renderSettings()
  return `<main class="admin-wrap"><div class="admin-head"><h1>Votre espace de gestion.</h1><button class="button button-outline" data-signout>Déconnexion</button></div>${state.adminError ? `<p class="form-error" role="alert">${escapeHtml(state.adminError)}</p>` : ''}${tabs}${panel}</main>`
}

function renderAdminMenu() {
  const draft = state.editItem
  const form = draft
    ? `<form class="admin-item-form" id="admin-item-form"><label class="field"><span>Nom</span><input name="name" required value="${escapeHtml(draft.name)}"></label><label class="field"><span>Prix</span><input name="price" type="number" min="0" step="0.01" required value="${escapeHtml(draft.price)}"></label><label class="field"><span>Catégorie</span><select name="category_id" required>${state.adminCategories.map((category) => `<option value="${escapeHtml(category.id)}" ${draft.category_id === category.id ? 'selected' : ''}>${escapeHtml(category.name)}</option>`).join('')}</select></label><label class="field"><span>Image (URL)</span><input name="image_url" value="${escapeHtml(draft.image_url)}"></label><label class="field"><span>Allergènes (séparés par des virgules)</span><input name="allergens" value="${escapeHtml((draft.allergens ?? []).join(', '))}"></label><label class="field"><span>Étiquettes (séparées par des virgules)</span><input name="labels" value="${escapeHtml((draft.labels ?? []).join(', '))}"></label><label class="field"><span>Ordre d’affichage</span><input name="sort_order" type="number" value="${escapeHtml(draft.sort_order)}"></label><label class="field field-full"><span>Description</span><textarea name="description" rows="3">${escapeHtml(draft.description)}</textarea></label><label class="privacy-check"><input type="checkbox" name="is_available" ${draft.is_available ? 'checked' : ''}>Disponible</label><div><button class="button button-dark">Enregistrer</button> <button type="button" class="button button-outline" data-cancel-edit>Annuler</button></div></form>`
    : ''
  const items = state.adminItems
    .map(
      (item) =>
        `<div class="admin-item-row"><div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.price)} · ${item.is_available ? 'Disponible' : 'Indisponible'}</span></div><button data-edit-item="${escapeHtml(item.id)}">Modifier</button><button data-archive-item="${escapeHtml(item.id)}">Archiver</button></div>`,
    )
    .join('')
  return `<section class="admin-menu"><div class="admin-panel-head"><h2>Plats et boissons</h2><button class="button button-dark" data-add-item>Ajouter un plat</button></div>${form}<div class="admin-item-list">${items}</div></section>`
}

function renderAdminReservations() {
  const rows = state.reservations
    .map(
      (reservation) =>
        `<tr><td>${escapeHtml(reservation.reservation_date)}<br>${escapeHtml(reservation.reservation_time)}</td><td>${escapeHtml(reservation.customer_name)}<small>${escapeHtml(reservation.customer_email)} · ${escapeHtml(reservation.customer_phone)}</small></td><td>${escapeHtml(reservation.guest_count)}</td><td>${escapeHtml(reservation.status)}</td><td class="table-actions">${reservation.status === 'pending' ? `<button data-reservation-status="confirmed" data-reservation-id="${escapeHtml(reservation.id)}">Confirmer</button>` : ''}${!['cancelled', 'completed'].includes(reservation.status) ? `<button data-reservation-status="cancelled" data-reservation-id="${escapeHtml(reservation.id)}">Annuler</button>` : ''}${reservation.status === 'confirmed' ? `<button data-reservation-status="completed" data-reservation-id="${escapeHtml(reservation.id)}">Terminer</button>` : ''}</td></tr>`,
    )
    .join('')
  return `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Date</th><th>Client</th><th>Personnes</th><th>Statut</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table>${rows ? '' : '<p class="state-message">Aucune réservation pour le moment.</p>'}</div>`
}

function renderSettings() {
  const openingHours = JSON.stringify(restaurant.openingHours, null, 2)
  const closedDays = restaurant.closedDays.join(',')
  return `<form class="settings-form" id="settings-form"><h2>Informations du restaurant</h2>${settingsInput('Nom', 'restaurant_name', restaurant.name)}${settingsInput('Description', 'description', restaurant.description)}${settingsInput('Adresse', 'address', restaurant.address)}${settingsInput('Téléphone', 'phone', restaurant.phone)}${settingsInput('E-mail', 'email', restaurant.email)}${settingsInput('Devise', 'currency', restaurant.currency)}<label class="field"><span>Convives maximum par réservation</span><input name="max_party_size" type="number" min="1" max="30" value="${restaurant.maxPartySize}"></label><label class="field"><span>Capacité totale par créneau</span><input name="max_guests_per_slot" type="number" min="1" max="300" value="${restaurant.maxGuestsPerSlot}"></label><label class="field"><span>Jours fermés (0 dimanche à 6 samedi)</span><input name="closed_days" value="${escapeHtml(closedDays)}"></label><label class="field field-full"><span>Créneaux par jour — JSON, clés de 0 à 6</span><textarea name="opening_hours" rows="9">${escapeHtml(openingHours)}</textarea></label><p class="form-note">Les valeurs enregistrées sont utilisées par le contrôle serveur des nouvelles réservations.</p><p data-settings-message role="status"></p><button class="button button-dark">Enregistrer les paramètres</button></form>`
}

function settingsInput(label, name, value) {
  return `<label class="field"><span>${label}</span><input name="${name}" value="${escapeHtml(value)}"></label>`
}

const pages = {
  '/': renderHome,
  '/histoire': renderStory,
  '/menu': renderMenu,
  '/galerie': renderGallery,
  '/reservation': renderReservation,
  '/contact': renderContact,
  '/mentions-legales': () => renderLegal(false),
  '/confidentialite': () => renderLegal(true),
  '/admin': renderAdmin,
}

function render() {
  pageMotion?.revert()
  renderHeader()
  renderFooter()
  const page = pages[window.location.pathname] ?? renderNotFound
  app.innerHTML =
    isSupabaseConfigured && state.restaurantError
      ? `<main class="subpage config-error" role="alert"><h1>Les informations du restaurant ne sont pas disponibles.</h1><p>Vérifiez la connexion Supabase et les paramètres du restaurant.</p><button class="button button-outline" data-reload>Réessayer</button></main>`
      : page()
  document.title = `${restaurant.name} — ${window.location.pathname === '/' ? 'Restaurant de saison' : window.location.pathname.slice(1) || 'Accueil'}`
  animatePage()
}

function animatePage() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  pageMotion = gsap.context(() => {
    const hero = app.querySelector('.hero')

    if (hero) {
      const intro = gsap.timeline({ defaults: { ease: 'power3.out' } })
      const heroImage = hero.querySelector('.hero-image img')
      const heroWordmark = hero.querySelector('.hero-wordmark')
      if (heroImage) intro.fromTo(heroImage, { scale: 1.08 }, { scale: 1, duration: 1.45, ease: 'power2.out' })
      if (heroWordmark) intro.fromTo(heroWordmark, { y: 36, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9 }, '-=1.05')
      intro.fromTo(hero.querySelectorAll('.hero-bottom > *'), { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.65, stagger: 0.09 }, '-=0.55')
    }

    const headings = app.querySelectorAll('.page-head, .intro-copy, .section-title, .experience-copy, .reservation-banner, .practical > div, .story-columns > div, .subpage-cta')
    headings.forEach((element) => {
      gsap.fromTo(element, { y: 24, autoAlpha: 0 }, {
        y: 0,
        autoAlpha: 1,
        duration: 0.75,
        ease: 'power3.out',
        scrollTrigger: { trigger: element, start: 'top 88%', once: true },
      })
    })

    const visualGroups = app.querySelectorAll('.intro-image, .dish, .experience-photo, .preview-grid > a, .story-lead, .story-wide > img, .gallery-item, .booking-form, .contact-layout > *, .legal-page section')
    visualGroups.forEach((element, index) => {
      gsap.fromTo(element, { y: 20, autoAlpha: 0 }, {
        y: 0,
        autoAlpha: 1,
        duration: 0.8,
        delay: index % 3 * 0.06,
        ease: 'power3.out',
        scrollTrigger: { trigger: element, start: 'top 91%', once: true },
      })
    })

    const image = hero?.querySelector('.hero-image img')
    if (image) {
      gsap.to(image, {
        yPercent: 5,
        ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 },
      })
    }
  }, app)

  requestAnimationFrame(() => ScrollTrigger.refresh())
}

function navigate(path) {
  if (path !== window.location.pathname) history.pushState({}, '', path)
  render()
  window.scrollTo(0, 0)
}

async function loadMenuData() {
  state.menuLoading = true
  try {
    state.menu = await loadMenu()
  } catch {
    state.menuError = 'Impossible de charger la carte. Réessayez plus tard.'
  } finally {
    state.menuLoading = false
    render()
  }
}

async function loadPublicSettings() {
  if (!supabase) return
  const { data, error } = await supabase
    .from('restaurant_settings')
    .select('*')
    .eq('id', 1)
    .single()
  if (error || !data) {
    state.restaurantError = true
    return
  }
  Object.assign(restaurant, {
    name: data.restaurant_name,
    description: data.description,
    address: data.address,
    phone: data.phone,
    email: data.email,
    currency: data.currency,
    timezone: data.timezone,
    maxPartySize: data.max_party_size,
    maxGuestsPerSlot: data.max_guests_per_slot,
    openingHours: data.opening_hours,
    closedDays: data.closed_days,
    hours: [
      'Dimanche',
      'Lundi',
      'Mardi',
      'Mercredi',
      'Jeudi',
      'Vendredi',
      'Samedi',
    ].map((day, index) => [
      day,
      data.closed_days.includes(index) ||
      !data.opening_hours[String(index)]?.length
        ? 'Fermé'
        : data.opening_hours[String(index)].join(' · '),
    ]),
  })
  state.restaurantError = false
}

async function loadAdminData() {
  if (!supabase || !state.session) return
  state.adminReady = false
  render()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle()
  if (profileError || profile?.role !== 'admin') {
    state.adminError = 'Votre compte ne dispose pas du rôle administrateur.'
    state.adminReady = false
    render()
    return
  }
  const [itemsResult, categoriesResult, reservationsResult] = await Promise.all(
    [
      supabase.from('menu_items').select('*').order('sort_order'),
      supabase.from('categories').select('id,name').order('sort_order'),
      supabase
        .from('reservations')
        .select(
          'id,customer_name,customer_email,customer_phone,reservation_date,reservation_time,guest_count,status',
        )
        .order('reservation_date', { ascending: false })
        .limit(100),
    ],
  )
  if (itemsResult.error || categoriesResult.error || reservationsResult.error) {
    state.adminError =
      'Certaines données n’ont pas pu être chargées. Vérifiez les migrations et les droits administrateur.'
  } else {
    state.adminItems = itemsResult.data ?? []
    state.adminCategories = categoriesResult.data ?? []
    state.reservations = reservationsResult.data ?? []
    state.adminReady = true
    state.adminError = ''
  }
  render()
}

async function handleReservationSubmit(form) {
  const data = new FormData(form)
  const values = Object.fromEntries(data.entries())
  const error = form.querySelector('[data-form-error]')
  const validationMessage = validateReservation(values)
  if (validationMessage) {
    error.textContent = validationMessage
  } else {
    error.textContent = ''
    const button = form.querySelector('button[type="submit"]')
    button.disabled = true
    button.textContent = 'Envoi en cours…'
    try {
      state.reservationResult = await createReservation({
        ...values,
        guest_count: Number(values.guest_count),
        occasion: values.occasion ?? '',
        special_requests: values.special_requests ?? '',
      })
      render()
    } catch {
      error.textContent =
        'La demande n’a pas pu être enregistrée. Réessayez ou contactez directement le restaurant.'
      button.disabled = false
      button.textContent = 'Envoyer ma demande'
    }
  }
}

document.addEventListener('click', async (event) => {
  const routeLink = event.target.closest('a[data-route]')
  if (
    routeLink &&
    !event.metaKey &&
    !event.ctrlKey &&
    routeLink.target !== '_blank'
  ) {
    event.preventDefault()
    navigate(routeLink.getAttribute('href'))
    return
  }
  if (event.target.closest('[data-menu-toggle]')) {
    const nav = header.querySelector('.main-nav')
    const button = event.target.closest('[data-menu-toggle]')
    nav.classList.toggle('is-open')
    button.setAttribute(
      'aria-expanded',
      String(nav.classList.contains('is-open')),
    )
    button.setAttribute(
      'aria-label',
      nav.classList.contains('is-open') ? 'Fermer le menu' : 'Ouvrir le menu',
    )
    return
  }
  const categoryButton = event.target.closest('[data-category]')
  if (categoryButton) {
    state.selectedCategory = categoryButton.dataset.category
    render()
    return
  }
  const galleryButton = event.target.closest('[data-gallery-index]')
  if (galleryButton) {
    state.activePhoto = Number(galleryButton.dataset.galleryIndex)
    render()
    return
  }
  if (
    event.target.closest('[data-lightbox-close]') ||
    (event.target.closest('[data-lightbox]') &&
      !event.target.closest('figure, button'))
  ) {
    state.activePhoto = null
    render()
    return
  }
  if (event.target.closest('[data-lightbox-next]')) {
    state.activePhoto = (state.activePhoto + 1) % gallery.length
    render()
    return
  }
  if (event.target.closest('[data-lightbox-prev]')) {
    state.activePhoto =
      (state.activePhoto + gallery.length - 1) % gallery.length
    render()
    return
  }
  if (event.target.closest('[data-new-reservation]')) {
    state.reservationResult = ''
    state.reservationDate = ''
    state.reservationTime = ''
    render()
    return
  }
  const tabButton = event.target.closest('[data-admin-tab]')
  if (tabButton) {
    state.adminTab = tabButton.dataset.adminTab
    state.editItem = null
    render()
    return
  }
  if (event.target.closest('[data-signout]')) {
    await supabase?.auth.signOut()
    return
  }
  if (event.target.closest('[data-reload]')) {
    state.restaurantError = false
    await loadPublicSettings()
    render()
    return
  }
  if (event.target.closest('[data-add-item]')) {
    state.editItem = {
      id: '',
      name: '',
      slug: '',
      description: '',
      price: 0,
      category_id: state.adminCategories[0]?.id ?? '',
      image_url: '',
      allergens: [],
      labels: [],
      is_available: true,
      sort_order: state.adminItems.length + 1,
    }
    render()
    return
  }
  const editButton = event.target.closest('[data-edit-item]')
  if (editButton) {
    state.editItem = {
      ...state.adminItems.find(
        (item) => item.id === editButton.dataset.editItem,
      ),
    }
    render()
    return
  }
  if (event.target.closest('[data-cancel-edit]')) {
    state.editItem = null
    render()
    return
  }
  const archiveButton = event.target.closest('[data-archive-item]')
  if (archiveButton) {
    const item = state.adminItems.find(
      (row) => row.id === archiveButton.dataset.archiveItem,
    )
    if (item && window.confirm(`Archiver « ${item.name} » ?`)) {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: false })
        .eq('id', item.id)
      if (error) state.adminError = 'Le plat n’a pas pu être archivé.'
      else await loadAdminData()
      render()
    }
    return
  }
  const statusButton = event.target.closest('[data-reservation-status]')
  if (statusButton) {
    const { error } = await supabase
      .from('reservations')
      .update({ status: statusButton.dataset.reservationStatus })
      .eq('id', statusButton.dataset.reservationId)
    if (error) state.adminError = 'Le statut n’a pas pu être modifié.'
    else await loadAdminData()
    render()
  }
})

document.addEventListener('change', (event) => {
  if (event.target.matches('[name="reservation_date"]')) {
    state.reservationDate = event.target.value
    state.reservationTime = ''
    const day = getWeekday(state.reservationDate)
    const slots =
      day === null
        ? [...new Set(Object.values(restaurant.openingHours).flat())].sort()
        : (restaurant.openingHours[String(day)] ?? [])
    const select = document.querySelector('[name="reservation_time"]')
    select.innerHTML = `<option value="">Choisir un créneau</option>${slots.map((time) => `<option value="${escapeHtml(time)}">${escapeHtml(time)}</option>`).join('')}`
  }
})

document.addEventListener('submit', async (event) => {
  const form = event.target
  if (!(form instanceof HTMLFormElement)) return
  if (form.id === 'reservation-form') {
    event.preventDefault()
    if (!form.reportValidity()) return
    await handleReservationSubmit(form)
  }
  if (form.id === 'contact-form') {
    event.preventDefault()
    if (!form.reportValidity() || !restaurant.email) return
    const values = Object.fromEntries(new FormData(form).entries())
    const body = encodeURIComponent(
      `De : ${values.name} (${values.email})\n\n${values.message}`,
    )
    window.location.href = `mailto:${restaurant.email}?subject=${encodeURIComponent(values.subject)}&body=${body}`
    form.querySelector('button').textContent = 'Message préparé'
  }
  if (form.id === 'admin-login') {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(form).entries())
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })
    if (error) {
      state.adminError = 'Connexion refusée. Vérifiez vos identifiants.'
      render()
    }
  }
  if (form.id === 'admin-item-form') {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(form).entries())
    const slug = values.name
      .toLocaleLowerCase('fr')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const item = {
      ...state.editItem,
      ...values,
      slug,
      price: Number(values.price),
      sort_order: Number(values.sort_order),
      allergens: values.allergens
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean),
      labels: values.labels
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean),
      is_available: form.elements.is_available.checked,
    }
    const { id, ...payload } = item
    const result = id
      ? await supabase.from('menu_items').update(payload).eq('id', id)
      : await supabase.from('menu_items').insert(payload)
    if (result.error) state.adminError = 'Le plat n’a pas pu être enregistré.'
    else {
      state.editItem = null
      await loadAdminData()
    }
    render()
  }
  if (form.id === 'settings-form') {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(form).entries())
    const message = form.querySelector('[data-settings-message]')
    try {
      const payload = {
        restaurant_name: values.restaurant_name,
        description: values.description,
        address: values.address,
        phone: values.phone,
        email: values.email,
        currency: values.currency,
        max_party_size: Number(values.max_party_size),
        max_guests_per_slot: Number(values.max_guests_per_slot),
        opening_hours: JSON.parse(values.opening_hours),
        closed_days: values.closed_days
          .split(',')
          .map((day) => Number(day.trim()))
          .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
      }
      const { error } = await supabase
        .from('restaurant_settings')
        .update(payload)
        .eq('id', 1)
      message.textContent = error
        ? 'Échec de l’enregistrement.'
        : 'Paramètres enregistrés.'
      if (!error) {
        await loadPublicSettings()
        renderHeader()
        renderFooter()
      }
    } catch {
      message.textContent =
        'Le format des horaires doit être un objet JSON valide.'
    }
  }
})

window.addEventListener('popstate', () => {
  render()
  window.scrollTo(0, 0)
})
window.addEventListener('keydown', (event) => {
  if (state.activePhoto === null) return
  if (event.key === 'Escape') {
    state.activePhoto = null
    render()
  }
  if (event.key === 'ArrowRight') {
    state.activePhoto = (state.activePhoto + 1) % gallery.length
    render()
  }
  if (event.key === 'ArrowLeft') {
    state.activePhoto =
      (state.activePhoto + gallery.length - 1) % gallery.length
    render()
  }
})

if (supabase) {
  supabase.auth.getSession().then(async ({ data }) => {
    state.session = data.session
    if (state.session && window.location.pathname === '/admin')
      await loadAdminData()
    else render()
  })
  supabase.auth.onAuthStateChange((_event, session) => {
    state.session = session
    if (!session) {
      state.adminReady = false
      state.adminError = ''
      render()
    } else if (window.location.pathname === '/admin') {
      void loadAdminData()
    } else {
      render()
    }
  })
  await loadPublicSettings()
}

render()
void loadMenuData()

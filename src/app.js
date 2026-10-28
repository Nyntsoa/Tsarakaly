import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { demoMenu, gallery, restaurant } from './data.js'
import { getWeekday } from './lib/dates.js'
import { loadMenu } from './lib/menu.js'
import { createReservation, validateReservation } from './lib/reservations.js'
import { isSupabaseConfigured, supabase } from './lib/supabase.js'
import {
  escapeHtml,
  renderFooterMarkup,
  renderHeaderMarkup,
  renderPage,
} from './views.js'

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

window.imageFallback = (image) => {
  const replacement = document.createElement('div')
  replacement.className = `photo-fallback ${image.className}`
  replacement.setAttribute('role', 'img')
  replacement.setAttribute('aria-label', image.alt)

  const name = document.createElement('span')
  name.textContent = restaurant.name
  replacement.append(name)
  image.replaceWith(replacement)
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

function renderSiteChrome() {
  header.className = 'site-header'
  header.innerHTML = renderHeaderMarkup(window.location.pathname)
  footer.className = 'site-footer'
  footer.innerHTML = renderFooterMarkup()
  fitFooterBrand()
}

function render() {
  pageMotion?.revert()
  renderSiteChrome()
  app.innerHTML = renderPage(window.location.pathname, state)
  document.title = `${restaurant.name} — ${window.location.pathname === '/' ? 'Restaurant de saison' : window.location.pathname.slice(1) || 'Accueil'}`
  animatePage()
}

function animatePage() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  pageMotion = gsap.context(() => {
    const hero = app.querySelector('.hero')

    if (hero) {
      const intro = gsap.timeline({ defaults: { ease: 'power2.out' } })
      const heroImage = hero.querySelector('.hero-image img')
      const heroWordmark = hero.querySelector('.hero-wordmark')
      if (heroImage) intro.fromTo(heroImage, { scale: 1.08 }, { scale: 1, duration: 2, ease: 'power2.out' })
      if (heroWordmark) intro.fromTo(heroWordmark, { y: 36, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.2 }, '-=1.05')
      intro.fromTo(hero.querySelectorAll('.hero-bottom > *'), { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.85, stagger: 0.1 }, '-=0.55')
    }

    const headings = app.querySelectorAll('.page-head, .intro-copy, .section-title, .experience-copy, .reservation-banner, .practical > div, .story-columns > div, .subpage-cta')
    headings.forEach((element) => {
      gsap.fromTo(element, { y: 24, autoAlpha: 0 }, {
        y: 0,
        autoAlpha: 1,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: { trigger: element, start: 'top 88%', once: true },
      })
    })

    const visualGroups = app.querySelectorAll('.intro-image, .dish, .experience-photo, .preview-grid > a, .story-lead, .story-wide > img, .gallery-item, .booking-form, .contact-layout > *, .legal-page section')
    visualGroups.forEach((element, index) => {
      gsap.fromTo(element, { y: 20, autoAlpha: 0 }, {
        y: 0,
        autoAlpha: 1,
        duration: 1.05,
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
        renderSiteChrome()
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

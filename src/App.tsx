import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowRight, Check, Clock3, MapPin, Menu as MenuIcon, Phone, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { categories, demoMenu, gallery, restaurant, type MenuItem } from './data'
import { filterMenu, loadMenu } from './lib/menu'
import { createReservation } from './lib/reservations'
import { reservationSchema } from './lib/reservationSchema'
import { isSupabaseConfigured, supabase } from './lib/supabase'

function useTop() {
  const location = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])
}

function Header() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const brandScale = Math.min(1, 9 / Math.max(1, restaurant.name.length))
  const brandStyle = {
    '--brand-desktop-size': `${2.35 * brandScale}vw`,
    '--brand-mobile-size': `${7.7 * brandScale}vw`,
  } as CSSProperties & { '--brand-desktop-size': string; '--brand-mobile-size': string }
  useEffect(() => setOpen(false), [location.pathname])
  return <header className="site-header">
    <span className="wordmark" style={brandStyle}>{restaurant.name}</span>
    <button className="mobile-toggle" aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <MenuIcon />}</button>
    <nav className={open ? 'main-nav is-open' : 'main-nav'} aria-label="Navigation principale">
      <NavLink to="/" end>Accueil</NavLink><NavLink to="/histoire">Histoire</NavLink><NavLink to="/menu">Menu</NavLink><NavLink to="/galerie">Galerie</NavLink><NavLink to="/contact">Contact</NavLink>
      <Link className="button button-dark nav-book" to="/reservation">Réserver une table <ArrowRight size={15} /></Link>
    </nav>
  </header>
}

function Footer() {
  return <footer className="site-footer">
    <div className="footer-top"><div><span className="footer-brand">{restaurant.name}</span><p>{restaurant.tagline}</p></div><div className="footer-links"><div><span>Explorer</span><Link to="/histoire">Notre histoire</Link><Link to="/menu">Le menu</Link><Link to="/galerie">La galerie</Link></div><div><span>Nous trouver</span>{restaurant.address && <p>{restaurant.address}</p>}{restaurant.phone && <a href={`tel:${restaurant.phone}`}>{restaurant.phone}</a>}{restaurant.email && <a href={`mailto:${restaurant.email}`}>{restaurant.email}</a>}</div><div><span>Informations</span><Link to="/contact">Contact</Link><Link to="/mentions-legales">Mentions légales</Link><Link to="/confidentialite">Confidentialité</Link></div></div></div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} Tsarakaly</span><span>L’art de savourer l’instant.</span></div>
  </footer>
}

function Photo({ src, alt, className = '', priority = false }: { src: string; alt: string; className?: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false)
  return failed ? <div className={`photo-fallback ${className}`} role="img" aria-label={alt}><span>{restaurant.name}</span></div> : <img className={className} src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} onError={() => setFailed(true)} />
}

function SectionTitle({ children, aside }: { children: string; aside?: string }) {
  return <div className="section-title"><h2>{children}</h2>{aside && <p>{aside}</p>}</div>
}

function Dish({ dish, index }: { dish: MenuItem; index: number }) {
  return <article className={`dish dish-${index + 1}`}>
    <div className="dish-photo"><Photo src={dish.image_url} alt={dish.name} /></div>
    <div className="dish-copy"><h3>{dish.name}</h3><p>{dish.description}</p><div className="dish-meta"><span>{dish.category}</span>{dish.labels.map((label) => <span key={label}>{label}</span>)}{dish.allergens.length > 0 && <span>Allergènes : {dish.allergens.join(', ')}</span>}<span>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: restaurant.currency, maximumFractionDigits: 0 }).format(dish.price)}</span></div></div>
  </article>
}

function Home() {
  const [dishes, setDishes] = useState(demoMenu.slice(0, 3))
  const [dishError, setDishError] = useState(false)
  useEffect(() => { loadMenu().then((items) => setDishes(items.slice(0, 3))).catch(() => { setDishes([]); setDishError(true) }) }, [])
  return <>
    <main>
      <section className="hero">
        <div className="hero-image"><Photo src="https://picsum.photos/id/625/2000/1200" alt="Une table baignée de lumière" priority /><div className="hero-overlay" /></div>
        <h1 className="hero-wordmark">{restaurant.name}</h1>
        <div className="hero-bottom"><p>{restaurant.description}</p><div className="hero-actions"><Link className="button button-dark" to="/menu">Découvrir le menu <ArrowRight size={16} /></Link><Link className="button button-outline" to="/reservation">Réserver une table</Link></div><a className="scroll-cue" href="#histoire" aria-label="Défiler vers notre histoire"><ArrowDown size={18} /></a></div>
      </section>

      <section id="histoire" className="intro-section section-pad">
        <div className="intro-image"><Photo src="https://picsum.photos/id/326/1200/1400" alt="Assiette de saison baignée de lumière" /></div>
        <div className="intro-copy"><h2><span className="desktop-heading">Une cuisine qui raconte une histoire.</span><span className="mobile-heading">Une cuisine de saison.</span></h2><p>Des produits choisis avec attention, des gestes précis et une carte qui évolue au fil des saisons. Chez Tsarakaly, chaque assiette laisse le produit s’exprimer.</p><Link className="text-link" to="/histoire">Découvrir notre histoire <ArrowRight size={16} /></Link></div>
      </section>

      <section className="selection-section section-pad">
        <SectionTitle aside="Les créations du chef, inspirées par les produits du marché.">La sélection du moment</SectionTitle>
        {dishError ? <p role="alert" className="state-message error-message">La sélection du chef ne peut pas être chargée pour le moment.</p> : dishes.length > 0 ? <div className="dish-grid">{dishes.map((dish, index) => <Dish key={dish.id} dish={dish} index={index} />)}</div> : <p className="state-message">La carte du moment sera bientôt disponible.</p>}
        <div className="center-action"><Link className="button button-outline" to="/menu">Voir toute la carte <ArrowRight size={16} /></Link></div>
      </section>

      <section className="experience-section"><div className="experience-photo"><Photo src="https://picsum.photos/id/208/1800/1100" alt="Lumière naturelle sur une table dressée" /></div><div className="experience-copy"><h2>Le plaisir de ralentir.</h2><p>Une salle accueillante, une cuisine attentive et le temps de partager. Nous imaginons chaque service comme une parenthèse simple et généreuse.</p><Link className="button button-cream" to="/reservation">Trouver ma table <ArrowRight size={16} /></Link></div></section>

      <section className="gallery-preview section-pad"><SectionTitle aside="Du marché à l’assiette, quelques instants autour de la table.">Autour de la table</SectionTitle><div className="preview-grid"><Link to="/galerie" className="preview-large"><Photo src={gallery[0]!.src} alt={gallery[0]!.alt} /><span>{gallery[0]!.caption}</span></Link><Link to="/galerie" className="preview-small"><Photo src={gallery[2]!.src} alt={gallery[2]!.alt} /><span>{gallery[2]!.caption}</span></Link><Link to="/galerie" className="preview-small second"><Photo src={gallery[4]!.src} alt={gallery[4]!.alt} /><span>{gallery[4]!.caption}</span></Link></div><Link className="text-link gallery-link" to="/galerie">Voir la galerie <ArrowRight size={16} /></Link></section>

      <section className="reservation-banner"><h2>Votre prochaine belle table vous attend.</h2><Link className="button button-cream" to="/reservation">Réserver une table <ArrowRight size={16} /></Link></section>
      <Practical />
    </main>
  </>
}

function Practical() {
  return <section className="practical section-pad"><div><h2>Nous serons heureux<br />de vous accueillir.</h2>{restaurant.address && <p>{restaurant.address}</p>}{restaurant.phone && <a href={`tel:${restaurant.phone}`}>{restaurant.phone}</a>}{restaurant.email && <a href={`mailto:${restaurant.email}`}>{restaurant.email}</a>}</div><div className="hours"><h3>Horaires</h3>{restaurant.hours.map(([day, hours]) => <div key={day}><span>{day}</span><span>{hours}</span></div>)}</div><div className="practical-links"><Link to="/contact">Nous contacter <ArrowRight size={16} /></Link><Link to="/reservation">Réserver une table <ArrowRight size={16} /></Link></div></section>
}

function PageHead({ label, title, text }: { label: string; title: string; text: string }) {
  void label
  return <div className="page-head"><h1>{title}</h1><p className="page-lead">{text}</p></div>
}

function Story() {
  return <main className="subpage">
    <PageHead label="Notre histoire" title="Le goût des choses justes." text="Une cuisine de saison, pensée autour des produits et du plaisir d’être ensemble." />
    <div className="story-lead"><Photo src="https://picsum.photos/id/625/1800/1000" alt="Salle lumineuse et table dressée" /><p>« Une belle assiette commence par un bon produit, et se partage sans façon. »</p></div>
    <section className="story-columns section-pad"><div><h2>Au rythme des saisons</h2><p>La carte suit le marché. Nous privilégions les récoltes du moment et faisons évoluer les assiettes au fil de l’année, sans figer une recette qui a déjà vécu.</p></div><div><h2>Le geste et le produit</h2><p>La cuisine reste lisible : une cuisson juste, des associations choisies et des préparations faites avec soin. Le produit garde sa place au centre.</p></div><div><h2>Une table à partager</h2><p>Tsarakaly est imaginé comme un lieu où l’on se retrouve, pour un déjeuner qui s’étire ou un dîner célébré à plusieurs.</p></div></section>
    <section className="story-wide"><Photo src="https://picsum.photos/id/326/1600/1100" alt="Assiette lumineuse aux produits de saison" /><div><h2>Du premier accueil au dernier café.</h2><p>Une attention discrète, une cuisine généreuse et une atmosphère chaleureuse composent l’expérience que nous souhaitons offrir.</p></div></section>
    <section className="subpage-cta"><h2>Une place à votre table ?</h2><Link className="button button-dark" to="/reservation">Réserver <ArrowRight size={16} /></Link></section>
  </main>
}

function MenuPage() {
  const [selected, setSelected] = useState<string>('Tous les plats')
  const [items, setItems] = useState<MenuItem[]>(demoMenu)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => { loadMenu().then(setItems).catch(() => setError('Impossible de charger la carte. Réessayez plus tard.')).finally(() => setLoading(false)) }, [])
  const shown = useMemo(() => filterMenu(items, selected), [items, selected])
  return <main className="subpage menu-page"><PageHead label="À la carte" title="La carte du moment." text="Une carte courte qui évolue au fil des saisons. " />
    {isSupabaseConfigured && <p className="source-note">Une carte de saison, travaillée au fil du marché.</p>}
    <div className="filter-bar" role="group" aria-label="Filtrer les plats">{categories.map((category) => <button key={category} onClick={() => setSelected(category)} className={selected === category ? 'filter-button active' : 'filter-button'} aria-pressed={selected === category}>{category}</button>)}</div>
    {loading ? <p role="status" className="state-message">Chargement de la carte…</p> : error ? <p role="alert" className="state-message error-message">{error}</p> : shown.length ? <div className="menu-list">{shown.map((dish, index) => <Dish key={dish.id} dish={dish} index={index % 3} />)}</div> : <p className="state-message">Aucun plat disponible dans cette catégorie pour le moment.</p>}
    <p className="allergen-note">N’hésitez pas à nous signaler vos allergies. Les allergènes ci-dessus sont indicatifs et doivent être confirmés.</p>
  </main>
}

function GalleryPage() {
  const [active, setActive] = useState<number | null>(null)
  useEffect(() => { if (active === null) return; const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setActive(null); if (event.key === 'ArrowRight') setActive((active + 1) % gallery.length); if (event.key === 'ArrowLeft') setActive((active + gallery.length - 1) % gallery.length) }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key) }, [active])
  return <main className="subpage gallery-page"><PageHead label="Galerie" title="Quelques instants à table." text="Une galerie de saison, du marché à l’assiette." /><div className="gallery-grid">{gallery.map((item, index) => <button key={item.src} className={`gallery-item gallery-item-${index + 1}`} onClick={() => setActive(index)} aria-label={`Agrandir : ${item.caption}`}><Photo src={item.src} alt={item.alt} /><span>{item.caption}</span></button>)}</div>
    {active !== null && <div className="lightbox" role="dialog" aria-modal="true" aria-label={gallery[active]!.caption} onClick={() => setActive(null)}><button className="lightbox-close" aria-label="Fermer" onClick={() => setActive(null)}><X /></button><button className="lightbox-prev" aria-label="Image précédente" onClick={(e) => { e.stopPropagation(); setActive((active + gallery.length - 1) % gallery.length) }}><ArrowLeft /></button><figure onClick={(e) => e.stopPropagation()}><Photo src={gallery[active]!.src} alt={gallery[active]!.alt} /><figcaption>{gallery[active]!.caption}</figcaption></figure><button className="lightbox-next" aria-label="Image suivante" onClick={(e) => { e.stopPropagation(); setActive((active + 1) % gallery.length) }}><ArrowRight /></button></div>}
  </main>
}

function ReservationPage() {
  const [result, setResult] = useState<'demo' | 'pending' | ''>('')
  const [submitError, setSubmitError] = useState('')
  const [sending, setSending] = useState(false)
  const minDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  const reservationTimes = [...new Set(Object.values(restaurant.openingHours).flat())].sort()
  const { register, handleSubmit, formState: { errors } } = useForm<z.input<typeof reservationSchema>, undefined, z.output<typeof reservationSchema>>({ resolver: zodResolver(reservationSchema), defaultValues: { guest_count: 2 } })
  const submit = handleSubmit(async (values) => { setSending(true); setSubmitError(''); try { const { privacy: _privacy, ...input } = values; void _privacy; setResult(await createReservation({ ...input, occasion: input.occasion ?? '', special_requests: input.special_requests ?? '' })) } catch { setSubmitError('La demande n’a pas pu être enregistrée. Réessayez ou contactez directement le restaurant.') } finally { setSending(false) } })
  return <main className="subpage reservation-page"><PageHead label="Réservation" title="À bientôt autour de la table." text="Choisissez votre moment et envoyez-nous une demande. Notre équipe vous répondra pour confirmer la disponibilité." />
    {result ? <div className="success-panel" role="status"><span className="success-icon"><Check /></span><h2>{result === 'demo' ? 'Réservation non enregistrée' : 'Demande reçue'}</h2><p>{result === 'demo' ? 'Le service de réservation en ligne n’est pas encore disponible. Contactez le restaurant pour organiser votre venue.' : 'Votre demande est en attente de confirmation. Aucune confirmation ni aucun e-mail automatique n’a été envoyé.'}</p><button className="button button-dark" onClick={() => setResult('')}>Faire une autre demande</button></div> : <form className="booking-form" onSubmit={submit} noValidate>
      <div className="form-grid"><Field label="Nom complet" error={errors.customer_name?.message}><input autoComplete="name" {...register('customer_name')} /></Field><Field label="Adresse e-mail" error={errors.customer_email?.message}><input type="email" autoComplete="email" {...register('customer_email')} /></Field><Field label="Téléphone" error={errors.customer_phone?.message}><input type="tel" autoComplete="tel" {...register('customer_phone')} /></Field><Field label="Date" error={errors.reservation_date?.message}><input type="date" min={minDate} {...register('reservation_date')} /></Field><Field label="Heure" error={errors.reservation_time?.message}><select {...register('reservation_time')} defaultValue=""><option value="" disabled>Choisir un créneau</option>{reservationTimes.map((time) => <option key={time}>{time}</option>)}</select></Field><Field label="Nombre de personnes" error={errors.guest_count?.message}><select {...register('guest_count', { valueAsNumber: true })}>{Array.from({ length: restaurant.maxPartySize }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1} {i === 0 ? 'personne' : 'personnes'}</option>)}</select></Field><Field label="Occasion (facultatif)" error={errors.occasion?.message}><input placeholder="Anniversaire, déjeuner…" {...register('occasion')} /></Field><Field label="Demandes particulières" error={errors.special_requests?.message} full><textarea rows={4} placeholder="Allergies ou détails utiles" {...register('special_requests')} /></Field></div>
      <label className="privacy-check"><input type="checkbox" {...register('privacy')} /><span>J’accepte la <Link to="/confidentialite">politique de confidentialité</Link>.</span></label>{errors.privacy && <span className="field-error">{errors.privacy.message}</span>}
      {submitError && <p role="alert" className="form-error">{submitError}</p>}
      <p className="form-note">{isSupabaseConfigured ? 'Les demandes sont enregistrées en attente de confirmation.' : 'Les réservations en ligne ne sont pas disponibles pour le moment.'}</p>
      <button className="button button-dark submit-button" type="submit" disabled={sending}>{sending ? 'Envoi en cours…' : 'Envoyer ma demande'} <ArrowRight size={16} /></button>
    </form>}
  </main>
}

function Field({ label, error, full, children }: { label: string; error?: string; full?: boolean; children: React.ReactNode }) { return <div className={`field ${full ? 'field-full' : ''}`}><label>{label}{children}</label>{error && <span className="field-error">{error}</span>}</div> }

function ContactPage() {
  const [sent, setSent] = useState(false)
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [message, setMessage] = useState('')
  const ready = Boolean(restaurant.email)
  return <main className="subpage contact-page"><PageHead label="Contact" title="Parlons de votre visite." text="Une question ou une occasion à célébrer ? Écrivez-nous ou retrouvez nos informations pratiques." />
    <div className="contact-layout"><div className="contact-details">{restaurant.address && <div><MapPin /><h3>Adresse</h3><p>{restaurant.address}</p></div>}<div><Clock3 /><h3>Horaires</h3>{restaurant.hours.map(([day, hours]) => <p className="contact-hour" key={day}><span>{day}</span><span>{hours}</span></p>)}</div>{restaurant.phone && <div><Phone /><h3>Téléphone</h3><a href={`tel:${restaurant.phone}`}>{restaurant.phone}</a></div>}</div>
      <form className="contact-form" onSubmit={(e) => { e.preventDefault(); if (!ready) return; const subject = encodeURIComponent('Message depuis le site Tsarakaly'); const body = encodeURIComponent(`De : ${name} (${email})\n\n${message}`); window.location.href = `mailto:${restaurant.email}?subject=${subject}&body=${body}`; setSent(true) }}><h2>Envoyez-nous un mot.</h2><Field label="Votre nom"><input required value={name} onChange={(e) => setName(e.target.value)} /></Field><Field label="Votre e-mail"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field><Field label="Objet"><input required /></Field><Field label="Votre message" full><textarea rows={5} required value={message} onChange={(e) => setMessage(e.target.value)} /></Field><p className="form-note">{ready ? 'Votre application de messagerie s’ouvrira pour envoyer le message.' : 'L’envoi de messages en ligne est momentanément indisponible.'}</p><button className="button button-dark" disabled={!ready}> {sent ? 'Message préparé' : 'Préparer le message'} <ArrowRight size={16} /></button></form></div>
  </main>
}

function LegalPage({ privacy = false }: { privacy?: boolean }) { return <main className="subpage legal-page"><PageHead label={privacy ? 'Confidentialité' : 'Mentions légales'} title={privacy ? 'Vos données, simplement.' : 'Informations légales.'} text="Informations sur Tsarakaly et le traitement des demandes envoyées depuis le site." /><section><h2>{privacy ? 'Données de réservation' : 'Éditeur du site'}</h2><p>{privacy ? 'Les renseignements fournis lors d’une réservation servent à répondre à votre demande et à en assurer le suivi. Pour toute question concernant vos données, contactez Tsarakaly depuis la page Contact.' : 'Éditeur : Tsarakaly. Hébergement : Vercel. Pour toute question concernant le site, contactez l’établissement depuis la page Contact.'}</p></section></main> }

type AdminItem = { id: string; name: string; slug: string; description: string; price: number; category_id: string; image_url: string; allergens: string[]; labels: string[]; is_available: boolean; sort_order: number }
type AdminReservation = { id: string; customer_name: string; customer_email: string; customer_phone: string; reservation_date: string; reservation_time: string; guest_count: number; status: string }
function AdminPage() {
  const [session, setSession] = useState<unknown>(null); const [roleOk, setRoleOk] = useState(false); const [booting, setBooting] = useState(true)
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [items, setItems] = useState<AdminItem[]>([]); const [res, setRes] = useState<AdminReservation[]>([]); const [cats, setCats] = useState<{ id: string; name: string }[]>([]); const [tab, setTab] = useState('menu'); const [saving, setSaving] = useState(false)
  useEffect(() => { if (!supabase) { setBooting(false); return } supabase.auth.getSession().then(({ data }) => setSession(data.session)).finally(() => setBooting(false)); const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession)); return () => listener.subscription.unsubscribe() }, [])
  useEffect(() => { if (!supabase || !session) { setRoleOk(false); return } let cancelled = false; supabase.auth.getUser().then(async ({ data }) => { if (!data.user) return; const { data: profile } = await supabase!.from('profiles').select('role').eq('id', data.user.id).maybeSingle(); if (!cancelled) { setRoleOk(profile?.role === 'admin'); if (profile?.role === 'admin') void refresh() } }); return () => { cancelled = true } }, [session])
  async function refresh() { const client = supabase; if (!client) return; const [m, c, r] = await Promise.all([client.from('menu_items').select('*').order('sort_order'), client.from('categories').select('id,name').order('sort_order'), client.from('reservations').select('id,customer_name,customer_email,customer_phone,reservation_date,reservation_time,guest_count,status').order('reservation_date', { ascending: false }).limit(100)]); if (m.error || c.error || r.error) { setError('Certaines données n’ont pas pu être chargées. Vérifiez les migrations et les droits administrateur.'); return } setItems(m.data ?? []); setCats(c.data ?? []); setRes(r.data ?? []) }
  async function login(e: React.FormEvent) { e.preventDefault(); if (!supabase) return; setSaving(true); setError(''); const { error: authError } = await supabase.auth.signInWithPassword({ email, password }); setSaving(false); if (authError) setError('Connexion refusée. Vérifiez vos identifiants.') }
  async function changeStatus(id: string, status: string) { const client = supabase; if (!client) return; const { error: updateError } = await client.from('reservations').update({ status }).eq('id', id); if (updateError) setError('Le statut n’a pas pu être modifié.'); else void refresh() }
  async function saveItem(item: AdminItem) { const client = supabase; if (!client) return; const { id, ...values } = item; const result = id ? await client.from('menu_items').update(values).eq('id', id) : await client.from('menu_items').insert(values); if (result.error) setError('Le plat n’a pas pu être enregistré.'); else void refresh() }
  async function deleteItem(item: AdminItem) { const client = supabase; if (!client || !window.confirm(`Archiver « ${item.name} » ?`)) return; const { error: deleteError } = await client.from('menu_items').update({ is_available: false }).eq('id', item.id); if (deleteError) setError('Le plat n’a pas pu être archivé.'); else void refresh() }
  if (booting) return <main className="admin-wrap"><p role="status">Vérification de la session…</p></main>
  if (!isSupabaseConfigured || !supabase) return <main className="subpage admin-wrap"><PageHead label="Administration" title="Configuration requise." text="L’espace administrateur est désactivé tant que Supabase n’est pas configuré." /><p className="admin-hint">Ajoutez les variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY, exécutez la migration, puis attribuez le rôle admin depuis la console SQL Supabase.</p></main>
  if (!session) return <main className="subpage admin-wrap"><PageHead label="Administration" title="Connexion sécurisée." text="Connectez-vous avec un compte authentifié et autorisé par son profil Supabase." /><form className="admin-login" onSubmit={login}><Field label="Adresse e-mail"><input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field><Field label="Mot de passe"><input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-dark" disabled={saving}>{saving ? 'Connexion…' : 'Se connecter'} <ArrowRight size={16} /></button></form></main>
  if (!roleOk) return <main className="subpage admin-wrap"><PageHead label="Administration" title="Accès non autorisé." text="Votre compte connecté ne dispose pas du rôle administrateur." />{error && <p role="alert">{error}</p>}<button className="button button-outline" onClick={() => void supabase?.auth.signOut()}>Se déconnecter</button></main>
  return <main className="admin-wrap"><div className="admin-head"><div><h1>Votre espace de gestion.</h1></div><button className="button button-outline" onClick={() => void supabase?.auth.signOut()}>Déconnexion</button></div>
    {error && <p className="form-error" role="alert">{error}</p>}<div className="admin-tabs"><button className={tab === 'menu' ? 'active' : ''} onClick={() => setTab('menu')}>Carte ({items.length})</button><button className={tab === 'reservations' ? 'active' : ''} onClick={() => setTab('reservations')}>Réservations ({res.length})</button><button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>Paramètres</button></div>
    {tab === 'menu' && <AdminMenu items={items} cats={cats} onSave={saveItem} onDelete={deleteItem} />}
    {tab === 'reservations' && <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Date</th><th>Client</th><th>Personnes</th><th>Statut</th><th>Actions</th></tr></thead><tbody>{res.map((r) => <tr key={r.id}><td>{r.reservation_date}<br />{r.reservation_time}</td><td>{r.customer_name}<small>{r.customer_email} · {r.customer_phone}</small></td><td>{r.guest_count}</td><td>{r.status}</td><td className="table-actions">{r.status === 'pending' && <button onClick={() => void changeStatus(r.id, 'confirmed')}>Confirmer</button>}{r.status !== 'cancelled' && r.status !== 'completed' && <button onClick={() => void changeStatus(r.id, 'cancelled')}>Annuler</button>}{r.status === 'confirmed' && <button onClick={() => void changeStatus(r.id, 'completed')}>Terminer</button>}</td></tr>)}</tbody></table>{res.length === 0 && <p className="state-message">Aucune réservation pour le moment.</p>}</div>}
    {tab === 'settings' && <SettingsPanel />}
  </main>
}

function AdminMenu({ items, cats, onSave, onDelete }: { items: AdminItem[]; cats: { id: string; name: string }[]; onSave: (item: AdminItem) => Promise<void>; onDelete: (item: AdminItem) => Promise<void> }) {
  const empty = (): AdminItem => ({ id: '', name: '', slug: '', description: '', price: 0, category_id: cats[0]?.id ?? '', image_url: '', allergens: [], labels: [], is_available: true, sort_order: items.length + 1 })
  const [draft, setDraft] = useState<AdminItem | null>(null)
  return <section className="admin-menu"><div className="admin-panel-head"><h2>Plats et boissons</h2><button className="button button-dark" onClick={() => setDraft(empty())}>Ajouter un plat</button></div>{draft && <form className="admin-item-form" onSubmit={(e) => { e.preventDefault(); void onSave({ ...draft, slug: draft.name.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-') }); setDraft(null) }}><Field label="Nom"><input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field><Field label="Prix"><input type="number" min="0" step="0.01" required value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} /></Field><Field label="Catégorie"><select value={draft.category_id} required onChange={(e) => setDraft({ ...draft, category_id: e.target.value })}>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label="Image (URL)"><input value={draft.image_url} onChange={(e) => setDraft({ ...draft, image_url: e.target.value })} /></Field><Field label="Allergènes (séparés par des virgules)"><input value={draft.allergens.join(', ')} onChange={(e) => setDraft({ ...draft, allergens: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} /></Field><Field label="Étiquettes (séparées par des virgules)"><input value={draft.labels.join(', ')} onChange={(e) => setDraft({ ...draft, labels: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} /></Field><Field label="Ordre d’affichage"><input type="number" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })} /></Field><Field label="Description" full><textarea rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field><label className="privacy-check"><input type="checkbox" checked={draft.is_available} onChange={(e) => setDraft({ ...draft, is_available: e.target.checked })} />Disponible</label><div><button className="button button-dark">Enregistrer</button> <button type="button" className="button button-outline" onClick={() => setDraft(null)}>Annuler</button></div></form>}<div className="admin-item-list">{items.map((item) => <div className="admin-item-row" key={item.id}><div><strong>{item.name}</strong><span>{item.price} · {item.is_available ? 'Disponible' : 'Indisponible'}</span></div><button onClick={() => setDraft(item)}>Modifier</button><button onClick={() => void onDelete(item)}>Archiver</button></div>)}</div></section>
}

function SettingsPanel() {
  const [settings, setSettings] = useState<{ id?: number; restaurant_name: string; description: string; address: string; phone: string; email: string; max_party_size: number; max_guests_per_slot: number; currency: string; opening_hours: string; closed_days: string }>({ restaurant_name: restaurant.name, description: restaurant.description, address: restaurant.address, phone: '', email: '', max_party_size: restaurant.maxPartySize, max_guests_per_slot: 24, currency: restaurant.currency, opening_hours: '{\n  "2": ["12:00", "12:30", "13:00", "19:00", "19:30", "20:00"],\n  "3": ["12:00", "12:30", "13:00", "19:00", "19:30", "20:00"],\n  "4": ["12:00", "12:30", "13:00", "19:00", "19:30", "20:00"],\n  "5": ["12:00", "12:30", "13:00", "19:00", "19:30", "20:00"],\n  "6": ["12:00", "12:30", "13:00", "19:00", "19:30", "20:00"]\n}', closed_days: '0,1' })
  const [message, setMessage] = useState('')
  useEffect(() => { void supabase?.from('restaurant_settings').select('*').limit(1).maybeSingle().then(({ data }) => { if (data) setSettings({ ...data, opening_hours: JSON.stringify(data.opening_hours, null, 2), closed_days: (data.closed_days as number[]).join(',') }) }) }, [])
  return <form className="settings-form" onSubmit={async (e) => { e.preventDefault(); try { const payload = { ...settings, opening_hours: JSON.parse(settings.opening_hours) as Record<string, string[]>, closed_days: settings.closed_days.split(',').map((day) => Number(day.trim())).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6) }; const result = settings.id ? await supabase!.from('restaurant_settings').update(payload).eq('id', settings.id) : await supabase!.from('restaurant_settings').insert(payload); setMessage(result.error ? 'Échec de l’enregistrement.' : 'Paramètres enregistrés.') } catch { setMessage('Le format des horaires doit être un objet JSON valide.') } }}><h2>Informations du restaurant</h2>{(['restaurant_name','description','address','phone','email','currency'] as const).map((key) => <Field key={key} label={{ restaurant_name: 'Nom', description: 'Description', address: 'Adresse', phone: 'Téléphone', email: 'E-mail', currency: 'Devise' }[key]}><input value={settings[key]} onChange={(e) => setSettings({ ...settings, [key]: e.target.value })} /></Field>)}<Field label="Convives maximum par réservation"><input type="number" min="1" max="30" value={settings.max_party_size} onChange={(e) => setSettings({ ...settings, max_party_size: Number(e.target.value) })} /></Field><Field label="Capacité totale par créneau"><input type="number" min="1" max="300" value={settings.max_guests_per_slot} onChange={(e) => setSettings({ ...settings, max_guests_per_slot: Number(e.target.value) })} /></Field><Field label="Jours fermés (0 dimanche à 6 samedi)"><input value={settings.closed_days} onChange={(e) => setSettings({ ...settings, closed_days: e.target.value })} /></Field><Field label="Créneaux par jour — JSON, clés de 0 à 6" full><textarea rows={9} value={settings.opening_hours} onChange={(e) => setSettings({ ...settings, opening_hours: e.target.value })} /></Field>{message && <p role="status">{message}</p>}<button className="button button-dark">Enregistrer les paramètres</button><p className="form-note">Les valeurs enregistrées sont utilisées par le contrôle serveur des nouvelles réservations.</p></form>
}

export default function App() {
  useTop()
  const [settingsState, setSettingsState] = useState<'loading' | 'ready' | 'error'>(isSupabaseConfigured ? 'loading' : 'ready')
  useEffect(() => {
    if (!supabase) return
    let current = true
    void supabase.from('restaurant_settings').select('*').eq('id', 1).single().then(({ data, error }) => {
      if (!current) return
      if (error || !data) { setSettingsState('error'); return }
      const names = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
      const openingHours = data.opening_hours as Record<string, string[]>
      const closedDays = data.closed_days as number[]
      const hours = names.map((day, index) => [day, closedDays.includes(index) || !openingHours[String(index)]?.length ? 'Fermé' : openingHours[String(index)]!.join(' · ')] as [string, string])
      Object.assign(restaurant, { name: data.restaurant_name, description: data.description, address: data.address, phone: data.phone, email: data.email, currency: data.currency, timezone: data.timezone, maxPartySize: data.max_party_size, closedDays, openingHours, hours })
      setSettingsState('ready')
    })
    return () => { current = false }
  }, [])
  if (settingsState === 'loading') return <main className="subpage state-message" role="status">Chargement des informations du restaurant…</main>
  if (settingsState === 'error') return <main className="subpage config-error" role="alert"><h1>Les informations du restaurant ne sont pas disponibles.</h1><p>La connexion aux informations du restaurant a échoué. Vérifiez votre connexion et réessayez.</p><button className="button button-outline" onClick={() => window.location.reload()}>Réessayer</button></main>
  return <><a className="skip-link" href="#contenu" onClick={(e) => { e.preventDefault(); document.querySelector('main')?.setAttribute('id', 'contenu'); document.getElementById('contenu')?.focus() }}>Aller au contenu</a><Header /><Routes><Route path="/" element={<Home />} /><Route path="/histoire" element={<Story />} /><Route path="/menu" element={<MenuPage />} /><Route path="/galerie" element={<GalleryPage />} /><Route path="/reservation" element={<ReservationPage />} /><Route path="/contact" element={<ContactPage />} /><Route path="/mentions-legales" element={<LegalPage />} /><Route path="/confidentialite" element={<LegalPage privacy />} /><Route path="/admin" element={<AdminPage />} /><Route path="*" element={<main className="subpage"><PageHead label="404" title="Cette page n’existe pas." text="Retrouvez le chemin vers notre table." /><Link className="button button-dark" to="/">Retour à l’accueil</Link></main>} /></Routes><Footer /></>
}

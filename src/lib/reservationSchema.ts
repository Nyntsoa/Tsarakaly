import { z } from 'zod'
import { restaurant } from '../data'

export const reservationSchema = z.object({
  customer_name: z.string().trim().min(2, 'Indiquez votre nom complet.').max(100),
  customer_email: z.email('Entrez une adresse e-mail valide.'),
  customer_phone: z.string().trim().min(6, 'Indiquez un numéro de téléphone valide.').max(30),
  reservation_date: z.string().min(1, 'Choisissez une date.'),
  reservation_time: z.string().min(1, 'Choisissez une heure.'),
  guest_count: z.number().int().min(1, 'Au moins une personne.').max(30, 'Pour les groupes plus importants, contactez le restaurant.'),
  occasion: z.string().max(100).optional(),
  special_requests: z.string().max(1000).optional(),
  privacy: z.literal(true, { error: 'Votre accord est nécessaire.' }),
}).superRefine((data, ctx) => {
  if (data.guest_count > restaurant.maxPartySize) ctx.addIssue({ code: 'custom', path: ['guest_count'], message: `Pour plus de ${restaurant.maxPartySize} personnes, contactez le restaurant.` })
  if (data.reservation_date) {
    const selectedDate = new Date(`${data.reservation_date}T12:00:00`)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    if (Number.isNaN(selectedDate.getTime()) || selectedDate < today) ctx.addIssue({ code: 'custom', path: ['reservation_date'], message: 'Choisissez une date à venir.' })
    if (restaurant.closedDays.includes(selectedDate.getDay())) ctx.addIssue({ code: 'custom', path: ['reservation_date'], message: 'Le restaurant est fermé ce jour-là.' })
  }
  if (data.reservation_time && !Object.values(restaurant.openingHours).some((slots) => slots.includes(data.reservation_time))) ctx.addIssue({ code: 'custom', path: ['reservation_time'], message: 'Choisissez un créneau proposé.' })
})

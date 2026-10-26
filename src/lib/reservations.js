import { isSupabaseConfigured, supabase } from './supabase.js'
import { restaurant } from '../data.js'
import { getTodayInTimezone, getWeekday } from './dates.js'

export function validateReservation(values) {
  const weekday = getWeekday(values.reservation_date)
  if (weekday === null) return 'Choisissez une date valide.'
  if (values.reservation_date < getTodayInTimezone(restaurant.timezone)) {
    return 'Choisissez une date à venir.'
  }
  if (restaurant.closedDays.includes(weekday)) {
    return 'Le restaurant est fermé ce jour-là.'
  }
  const slots = restaurant.openingHours[String(weekday)] ?? []
  if (!slots.includes(values.reservation_time)) {
    return 'Choisissez un créneau proposé pour cette date.'
  }
  if (!values.privacy) return 'Votre accord est nécessaire.'
  if (Number(values.guest_count) > restaurant.maxPartySize) {
    return `Pour plus de ${restaurant.maxPartySize} personnes, contactez le restaurant.`
  }
  return ''
}

export async function createReservation(input) {
  if (!isSupabaseConfigured || !supabase) return 'demo'

  const { error } = await supabase.rpc('create_reservation', {
    p_customer_name: input.customer_name,
    p_customer_email: input.customer_email,
    p_customer_phone: input.customer_phone,
    p_reservation_date: input.reservation_date,
    p_reservation_time: input.reservation_time,
    p_guest_count: input.guest_count,
    p_occasion: input.occasion || null,
    p_special_requests: input.special_requests || null,
  })

  if (error) throw error
  return 'pending'
}

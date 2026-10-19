import { isSupabaseConfigured, supabase } from './supabase'

export type ReservationInput = {
  customer_name: string; customer_email: string; customer_phone: string; reservation_date: string
  reservation_time: string; guest_count: number; occasion: string; special_requests: string
}

export async function createReservation(input: ReservationInput): Promise<'demo' | 'pending'> {
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

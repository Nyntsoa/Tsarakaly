import { describe, expect, it } from 'vitest'
import { reservationSchema } from './reservationSchema'

const base = { customer_name: 'Ada Exemple', customer_email: 'ada@example.test', customer_phone: '+261 34 00 000 00', reservation_date: '2099-04-14', reservation_time: '19:30', guest_count: 2, occasion: '', special_requests: '', privacy: true as const }

describe('reservationSchema', () => {
  it('accepts a complete reservation on a future open day', () => {
    expect(reservationSchema.safeParse(base).success).toBe(true)
  })
  it('rejects invalid email, past dates, and out-of-range party sizes', () => {
    expect(reservationSchema.safeParse({ ...base, customer_email: 'invalid' }).success).toBe(false)
    expect(reservationSchema.safeParse({ ...base, reservation_date: '2000-01-01' }).success).toBe(false)
    expect(reservationSchema.safeParse({ ...base, guest_count: 9 }).success).toBe(false)
  })
  it('rejects dates the demo restaurant is configured to close', () => {
    expect(reservationSchema.safeParse({ ...base, reservation_date: '2099-04-12' }).success).toBe(false)
  })
  it('requires privacy consent and an offered time slot', () => {
    expect(reservationSchema.safeParse({ ...base, privacy: false }).success).toBe(false)
    expect(reservationSchema.safeParse({ ...base, reservation_time: '16:15' }).success).toBe(false)
  })
})

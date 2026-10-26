import { describe, expect, it } from 'vitest'
import { restaurant } from '../data.js'
import { validateReservation } from './reservations.js'

const validRequest = {
  customer_name: 'Ada Exemple',
  customer_email: 'ada@example.test',
  customer_phone: '+261 34 00 000 00',
  reservation_date: '2099-04-14',
  reservation_time: '19:30',
  guest_count: '2',
  privacy: 'on',
}

describe('validateReservation', () => {
  it('accepts a future reservation on an open day', () => {
    expect(validateReservation(validRequest)).toBe('')
  })

  it('rejects a closed day and a time not offered for the selected day', () => {
    expect(
      validateReservation({ ...validRequest, reservation_date: '2099-04-12' }),
    ).toContain('fermé')

    const weekday = new Date(
      `${validRequest.reservation_date}T00:00:00Z`,
    ).getUTCDay()
    const dayKey = String(weekday)
    const original = restaurant.openingHours[dayKey]
    restaurant.openingHours[dayKey] = ['12:00']
    try {
      expect(validateReservation(validRequest)).toContain('créneau')
    } finally {
      restaurant.openingHours[dayKey] = original
    }
  })

  it('requires privacy consent and respects the party size limit', () => {
    expect(validateReservation({ ...validRequest, privacy: '' })).toContain(
      'accord',
    )
    expect(
      validateReservation({
        ...validRequest,
        guest_count: String(restaurant.maxPartySize + 1),
      }),
    ).toContain('personnes')
  })
})

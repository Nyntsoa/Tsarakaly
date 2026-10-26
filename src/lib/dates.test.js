import { describe, expect, it } from 'vitest'
import { getTodayInTimezone, getWeekday } from './dates.js'

describe('date helpers', () => {
  it('uses the restaurant time zone to determine today', () => {
    expect(
      getTodayInTimezone(
        'Indian/Antananarivo',
        new Date('2026-10-18T22:30:00Z'),
      ),
    ).toBe('2026-10-19')
  })

  it('returns the ISO date weekday and rejects invalid dates', () => {
    expect(getWeekday('2026-10-19')).toBe(1)
    expect(getWeekday('2026-02-30')).toBeNull()
    expect(getWeekday('19/10/2026')).toBeNull()
  })
})

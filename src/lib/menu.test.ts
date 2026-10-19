import { describe, expect, it } from 'vitest'
import { demoMenu } from '../data'
import { filterMenu } from './menu'

describe('filterMenu', () => {
  it('returns only available items matching a selected category', () => {
    const filtered = filterMenu(demoMenu, 'Desserts')
    expect(filtered.length).toBeGreaterThan(0)
    expect(filtered.every((item) => item.category === 'Desserts' && item.is_available)).toBe(true)
  })
  it('keeps unavailable items out of the public menu', () => {
    expect(filterMenu([{ ...demoMenu[0]!, is_available: false }], 'Tous les plats')).toEqual([])
  })
})

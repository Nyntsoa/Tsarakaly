import { describe, expect, it } from 'vitest'
import { demoMenu } from '../data.js'
import { filterMenu } from './menu.js'

describe('filterMenu', () => {
  it('returns available items in the selected category', () => {
    const desserts = filterMenu(demoMenu, 'Desserts')

    expect(desserts.length).toBeGreaterThan(0)
    expect(
      desserts.every(
        (item) => item.category === 'Desserts' && item.is_available,
      ),
    ).toBe(true)
  })

  it('hides unavailable items from the public menu', () => {
    expect(
      filterMenu([{ ...demoMenu[0], is_available: false }], 'Tous les plats'),
    ).toEqual([])
  })
})

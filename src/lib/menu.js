import { demoMenu } from '../data.js'
import { isSupabaseConfigured, supabase } from './supabase.js'

export function filterMenu(items, category) {
  return items.filter(
    (item) =>
      item.is_available &&
      (category === 'Tous les plats' || category === item.category),
  )
}

export async function loadMenu() {
  if (!isSupabaseConfigured || !supabase) return demoMenu

  const { data, error } = await supabase
    .from('menu_items')
    .select('*, categories!inner(name, is_active)')
    .eq('is_available', true)
    .eq('categories.is_active', true)
    .order('sort_order')

  if (error) throw error

  return (data ?? []).flatMap((row) => {
    const category = Array.isArray(row.categories)
      ? row.categories[0]
      : row.categories
    if (!category?.name) return []

    const { categories: _categories, ...item } = row
    return [{ ...item, category: category.name }]
  })
}

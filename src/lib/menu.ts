import { demoMenu, type MenuItem } from '../data'
import { isSupabaseConfigured, supabase } from './supabase'

export function filterMenu(items: MenuItem[], category: string): MenuItem[] {
  return items.filter((item) => item.is_available && (category === 'Tous les plats' || category === item.category))
}

export async function loadMenu(): Promise<MenuItem[]> {
  if (!isSupabaseConfigured || !supabase) return demoMenu
  const { data, error } = await supabase.from('menu_items').select('*, categories(name)').eq('is_available', true).order('sort_order')
  if (error) throw error
  return (data ?? []).map((row) => ({ ...row, category: row.categories.name })) as MenuItem[]
}

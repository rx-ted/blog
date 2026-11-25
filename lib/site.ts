import { normalizeTheme, type Theme } from '@/lib/appearance'
import { getPublicCategories, getSettings } from '@/lib/db'

export interface SiteNavLink {
  label: string
  url: string
  openInNewTab: boolean
}

export interface SiteCategoryLink {
  name: string
  slug: string
}

export async function getSiteHeaderData(db: D1Database): Promise<{
  navLinks: SiteNavLink[]
  categories: SiteCategoryLink[]
  defaultTheme: Theme
}> {
  let navLinks: SiteNavLink[] = []
  let categories: SiteCategoryLink[] = []
  let defaultTheme: Theme = 'default'

  try {
    const [settings, categoryRows] = await Promise.all([
      getSettings(db, ['nav_links', 'default_theme']),
      getPublicCategories(db),
    ])
    const navJson = settings.nav_links

    if (navJson) {
      try {
        const parsed = JSON.parse(navJson)
        if (Array.isArray(parsed)) {
          navLinks = parsed
        }
      } catch {}
    }

    categories = categoryRows
      .filter(
        (category) =>
          category.slug && category.name && category.name !== '未分类',
      )
      .map((category) => ({
        name: category.name,
        slug: category.slug,
      }))

    defaultTheme = normalizeTheme(settings.default_theme)
  } catch {
    // Keep graceful fallback behavior for public pages
  }

  return { navLinks, categories, defaultTheme }
}

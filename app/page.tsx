import { getPosts, getPostsCount } from '@/lib/db'
import { getAppCloudflareEnv } from '@/lib/cloudflare'
import type { Theme } from '@/lib/appearance'
import type { SiteCategoryLink, SiteNavLink } from '@/lib/site'
import { getSiteHeaderData } from '@/lib/site'
import { HomeClient } from '@/components/HomeClient'
import { getSiteUrl } from '@/lib/site-config'
import { getCachedPublicData } from '@/lib/public-site-cache'

const PAGE_SIZE = 25
const BASE_URL = getSiteUrl()

// Cloudflare Workers 缓存策略
export const revalidate = 3600 // 1小时缓存
export const dynamicParams = true

export const metadata = {
  alternates: {
    canonical: BASE_URL,
  },
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageStr } = await searchParams
  const currentPage = Math.max(1, parseInt(pageStr ?? '1', 10) || 1)

  let posts: Awaited<ReturnType<typeof getPosts>> = []
  let totalCount = 0
  let navLinks: SiteNavLink[] = []
  let categories: SiteCategoryLink[] = []
  let defaultTheme: Theme = 'default'
  try {
    const env = await getAppCloudflareEnv()
    if (env?.DB) {
      const db = env.DB
      const { headerData, nextPosts, nextTotalCount } =
        await getCachedPublicData(env, `home:page:${currentPage}`, async () => {
          const [headerData, nextPosts, nextTotalCount] = await Promise.all([
            getSiteHeaderData(db),
            getPosts(db, PAGE_SIZE, (currentPage - 1) * PAGE_SIZE),
            getPostsCount(db),
          ])
          return { headerData, nextPosts, nextTotalCount }
        })
      posts = nextPosts
      totalCount = nextTotalCount
      navLinks = headerData.navLinks
      categories = headerData.categories
      defaultTheme = headerData.defaultTheme
    }
  } catch (e) {
    console.error('Homepage: failed to fetch posts', e)
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const categorySlugMap: Record<string, string> = Object.fromEntries(
    categories.map((cat) => [cat.name, cat.slug]),
  )

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: '木羽博客',
            url: BASE_URL,
            description: '学习技术，记录思考，分享所学，探索未知。',
            potentialAction: {
              '@type': 'SearchAction',
              target: {
                '@type': 'EntryPoint',
                urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
              },
              'query-input': 'required name=search_term_string',
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: '木羽博客',
            url: BASE_URL,
            logo: { '@type': 'ImageObject', url: `${BASE_URL}/icon-512.png` },
          }),
        }}
      />
      <HomeClient
        initialTheme={defaultTheme}
        posts={posts}
        categories={categories}
        navLinks={navLinks}
        currentPage={currentPage}
        totalPages={totalPages}
        categorySlugMap={categorySlugMap}
      />
    </>
  )
}

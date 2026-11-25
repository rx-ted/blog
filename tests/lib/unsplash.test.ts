import { describe, expect, it } from 'vitest'

import {
  isValidUnsplashDownloadLocation,
  mapUnsplashPhotoToLibraryItem,
} from '@/lib/unsplash'

describe('unsplash helpers', () => {
  it('maps Unsplash photos into collage library items without exposing API config', () => {
    const item = mapUnsplashPhotoToLibraryItem({
      id: 'photo-1',
      alt_description: 'A quiet desk',
      urls: {
        regular: 'https://images.unsplash.com/photo-1?w=1600',
        small: 'https://images.unsplash.com/photo-1?w=400',
      },
      links: {
        html: 'https://unsplash.com/photos/photo-1',
        download_location:
          'https://api.unsplash.com/photos/photo-1/download?ixid=test',
      },
      user: {
        name: 'Jane Doe',
        username: 'jane',
      },
    })

    expect(item).toEqual({
      id: 'unsplash-photo-1',
      title: 'A quiet desk',
      category: 'Unsplash',
      src: 'https://images.unsplash.com/photo-1?w=1600',
      thumbnail: 'https://images.unsplash.com/photo-1?w=400',
      source: 'Jane Doe',
      downloadLocation:
        'https://api.unsplash.com/photos/photo-1/download?ixid=test',
      link: 'https://unsplash.com/photos/photo-1',
    })
  })

  it('only accepts official Unsplash download tracking URLs', () => {
    expect(
      isValidUnsplashDownloadLocation(
        'https://api.unsplash.com/photos/abc/download?ixid=test',
      ),
    ).toBe(true)
    expect(
      isValidUnsplashDownloadLocation(
        'https://images.unsplash.com/photos/abc/download',
      ),
    ).toBe(false)
    expect(
      isValidUnsplashDownloadLocation(
        'https://example.com/photos/abc/download',
      ),
    ).toBe(false)
    expect(isValidUnsplashDownloadLocation('not a url')).toBe(false)
  })
})

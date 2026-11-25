import { describe, expect, it } from 'vitest'
import {
  extractFirstMarkdownH1,
  parseImportedMarkdown,
} from '@/lib/import-markdown-post'

describe('extractFirstMarkdownH1', () => {
  it('extracts the first h1 at the start and strips it from body', () => {
    const result = extractFirstMarkdownH1('# Hello World\n\nBody text')
    expect(result).toEqual({ title: 'Hello World', body: 'Body text' })
  })

  it('returns null when no h1 exists', () => {
    expect(extractFirstMarkdownH1('## Subtitle\n\nBody')).toBeNull()
  })

  it('does not strip an h1 that is not at the start of content', () => {
    const markdown = 'Intro\n\n# Later Title\n\nBody'
    const result = extractFirstMarkdownH1(markdown)
    expect(result).toEqual({ title: 'Later Title', body: markdown })
  })
})

describe('parseImportedMarkdown', () => {
  it('parses frontmatter fields and body with common aliases', () => {
    const markdown = `---
title: My Post
slug: my-post
description: A short desc
tags:
  - react
  - nextjs
cover: /cover.png
category: Tech
---

# Ignored Heading

Hello **world**`

    const result = parseImportedMarkdown(markdown)

    expect(result.title).toBe('My Post')
    expect(result.slug).toBe('my-post')
    expect(result.description).toBe('A short desc')
    expect(result.tags).toEqual(['react', 'nextjs'])
    expect(result.coverImage).toBe('/cover.png')
    expect(result.category).toBe('Tech')
    expect(result.body.trim()).toBe('# Ignored Heading\n\nHello **world**')
  })

  it('supports alias keys for description, tags, cover and categories', () => {
    const markdown = `---
desc: Summary
tag: one, two, one
image: https://example.com/img.png
categories:
  - First
  - Second
---

Body`

    const result = parseImportedMarkdown(markdown)

    expect(result.description).toBe('Summary')
    expect(result.tags).toEqual(['one', 'two'])
    expect(result.coverImage).toBe('https://example.com/img.png')
    expect(result.category).toBe('First')
  })

  it('uses first-level heading as title when frontmatter title is missing and strips it', () => {
    const markdown = `---
slug: hello
---

# Heading Title

Paragraph`

    const result = parseImportedMarkdown(markdown)

    expect(result.title).toBe('Heading Title')
    expect(result.slug).toBe('hello')
    expect(result.body).toBe('Paragraph')
  })

  it('treats content without frontmatter as body and extracts h1 title', () => {
    const markdown = '# Plain Title\n\nJust content'

    const result = parseImportedMarkdown(markdown)

    expect(result.title).toBe('Plain Title')
    expect(result.body).toBe('Just content')
    expect(result.slug).toBeUndefined()
    expect(result.description).toBeUndefined()
    expect(result.tags).toBeUndefined()
    expect(result.coverImage).toBeUndefined()
    expect(result.category).toBeUndefined()
  })

  it('keeps whole file as body when no frontmatter and no h1 title', () => {
    const markdown = 'No heading here\n\nSecond paragraph'

    const result = parseImportedMarkdown(markdown)

    expect(result.title).toBeUndefined()
    expect(result.body).toBe('No heading here\n\nSecond paragraph')
  })

  it('does not include fields that are not provided in frontmatter', () => {
    const markdown = `---
title: Only title
---

Body`

    const result = parseImportedMarkdown(markdown)

    expect(result.title).toBe('Only title')
    expect(result.slug).toBeUndefined()
    expect(result.tags).toBeUndefined()
    expect(result.coverImage).toBeUndefined()
    expect(result.category).toBeUndefined()
  })

  it('handles BOM in markdown source', () => {
    const markdown = '\ufeff---\ntitle: BOM\n---\n\nBody'
    const result = parseImportedMarkdown(markdown)
    expect(result.title).toBe('BOM')
    expect(result.body.trim()).toBe('Body')
  })
})

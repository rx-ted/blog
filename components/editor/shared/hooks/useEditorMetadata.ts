import { useCallback, useEffect, useRef, useState } from 'react'
import type { DraftMetaState } from '@/components/editor/shared'

export interface EditorMetadataInitialData {
  id?: number
  slug?: string
  category?: string
  tags?: string[]
  description?: string | null
  cover_image?: string | null
}

export interface UseEditorMetadataOptions {
  initialData?: EditorMetadataInitialData
  markDirty?: (metaOverrides?: Partial<DraftMetaState>) => void
}

export function createEmptyDraftMetaState(
  initialData?: EditorMetadataInitialData,
): DraftMetaState {
  return {
    postId: initialData?.id ?? null,
    editSlug: initialData?.slug ?? null,
    slug: initialData?.slug || '',
    category: initialData?.category || '未分类',
    tags: initialData?.tags || [],
    description: initialData?.description || '',
    coverImage: initialData?.cover_image || '',
  }
}

export function useEditorMetadata({
  initialData,
  markDirty,
}: UseEditorMetadataOptions = {}) {
  const [postId, setPostId] = useState<number | null>(initialData?.id ?? null)
  const [editSlug, setEditSlug] = useState<string | null>(
    initialData?.slug ?? null,
  )
  const [slug, setSlug] = useState(initialData?.slug || '')
  const [category, setCategory] = useState(initialData?.category || '未分类')
  const [tags, setTags] = useState<string[]>(initialData?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [description, setDescription] = useState(initialData?.description || '')
  const [coverImage, setCoverImage] = useState(initialData?.cover_image || '')

  const slugInputFocusedRef = useRef(false)
  const latestMetaRef = useRef<DraftMetaState>(
    createEmptyDraftMetaState(initialData),
  )

  useEffect(() => {
    latestMetaRef.current = {
      postId,
      editSlug,
      slug,
      category,
      tags,
      description,
      coverImage,
    }
  }, [postId, editSlug, slug, category, tags, description, coverImage])

  const patchMetadata = useCallback(
    (metaOverrides?: Partial<DraftMetaState>) => {
      if (!metaOverrides || Object.keys(metaOverrides).length === 0) return

      latestMetaRef.current = {
        ...latestMetaRef.current,
        ...metaOverrides,
      }

      if (metaOverrides.postId !== undefined) setPostId(metaOverrides.postId)
      if (metaOverrides.editSlug !== undefined)
        setEditSlug(metaOverrides.editSlug)
      if (metaOverrides.slug !== undefined) setSlug(metaOverrides.slug)
      if (metaOverrides.category !== undefined)
        setCategory(metaOverrides.category)
      if (metaOverrides.tags !== undefined) setTags(metaOverrides.tags)
      if (metaOverrides.description !== undefined)
        setDescription(metaOverrides.description)
      if (metaOverrides.coverImage !== undefined)
        setCoverImage(metaOverrides.coverImage)
    },
    [],
  )

  const syncPersistedSlug = useCallback(
    (
      persistedSlug: string,
      previousSlug: string | null,
      forceVisibleSync = false,
    ) => {
      const shouldSyncVisibleSlug =
        forceVisibleSync ||
        !slugInputFocusedRef.current ||
        latestMetaRef.current.slug === persistedSlug

      latestMetaRef.current = {
        ...latestMetaRef.current,
        editSlug: persistedSlug,
        slug: shouldSyncVisibleSlug
          ? persistedSlug
          : latestMetaRef.current.slug,
      }

      setEditSlug(persistedSlug)
      if (shouldSyncVisibleSlug) {
        setSlug(persistedSlug)
      }

      if (persistedSlug !== previousSlug && typeof window !== 'undefined') {
        window.history.replaceState(
          {},
          '',
          `/editor?edit=${encodeURIComponent(persistedSlug)}`,
        )
      }
    },
    [],
  )

  const addTag = useCallback(
    (value: string) => {
      const t = value.trim().slice(0, 20)
      if (!t || tags.includes(t) || tags.length >= 10) return
      const nextTags = [...tags, t]
      setTags(nextTags)
      setTagInput('')
      markDirty?.({ tags: nextTags })
    },
    [markDirty, tags],
  )

  const removeTag = useCallback(
    (idx: number) => {
      const nextTags = tags.filter((_, i) => i !== idx)
      setTags(nextTags)
      markDirty?.({ tags: nextTags })
    },
    [markDirty, tags],
  )

  const resetMetadata = useCallback(() => {
    const emptyMeta = createEmptyDraftMetaState()
    latestMetaRef.current = emptyMeta
    setPostId(emptyMeta.postId)
    setEditSlug(emptyMeta.editSlug)
    setSlug(emptyMeta.slug)
    setCategory(emptyMeta.category)
    setTags(emptyMeta.tags)
    setTagInput('')
    setDescription(emptyMeta.description)
    setCoverImage(emptyMeta.coverImage)
  }, [])

  return {
    postId,
    setPostId,
    editSlug,
    setEditSlug,
    slug,
    setSlug,
    category,
    setCategory,
    tags,
    setTags,
    tagInput,
    setTagInput,
    addTag,
    removeTag,
    description,
    setDescription,
    coverImage,
    setCoverImage,
    slugInputFocusedRef,
    latestMetaRef,
    patchMetadata,
    syncPersistedSlug,
    resetMetadata,
  }
}

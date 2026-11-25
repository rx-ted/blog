import { useCallback } from 'react'
import type { EditorInstance } from 'novel'
import { normalizePostSlug } from '@/lib/post-utils'
import { startBackgroundTask } from '@/lib/client-background-task'
import type { MetaGenerationTarget } from '@/components/editor/shared'

interface UseNovelMetadataGenerationOptions {
  editorRef: React.RefObject<EditorInstance | null>
  latestTitleRef: React.RefObject<string>
  title: string
  category: string
  description: string
  tags: string[]
  slug: string
  editSlug: string | null
  pendingMetadataTargets: MetaGenerationTarget[]
  setPendingMetadataTargets: React.Dispatch<
    React.SetStateAction<MetaGenerationTarget[]>
  >
  toast: {
    success: (msg: string) => void
    error: (msg: string) => void
    info: (msg: string) => void
  }
  setFeedback: React.Dispatch<React.SetStateAction<any>>
  setDescription: React.Dispatch<React.SetStateAction<string>>
  setTags: React.Dispatch<React.SetStateAction<string[]>>
  setTagInput: React.Dispatch<React.SetStateAction<string>>
  setSlug: (slug: string) => void
  setCoverImage: (cover: string) => void
  markDirty: (metaOverrides?: any) => void
}

export function useNovelMetadataGeneration({
  editorRef,
  latestTitleRef,
  title,
  category,
  description,
  tags,
  slug,
  editSlug,
  pendingMetadataTargets,
  setPendingMetadataTargets,
  toast,
  setFeedback,
  setDescription,
  setTags,
  setTagInput,
  setSlug,
  setCoverImage,
  markDirty,
}: UseNovelMetadataGenerationOptions) {
  const setMetadataTargetPending = useCallback(
    (target: MetaGenerationTarget, pending: boolean) => {
      setPendingMetadataTargets((current) => {
        if (pending) {
          return current.includes(target) ? current : [...current, target]
        }
        return current.filter((item) => item !== target)
      })
    },
    [setPendingMetadataTargets],
  )

  const isMetadataTargetPending = useCallback(
    (target: MetaGenerationTarget) => pendingMetadataTargets.includes(target),
    [pendingMetadataTargets],
  )

  const handleGenerateMetadata = useCallback(
    (target: MetaGenerationTarget) => {
      const editor = editorRef.current
      const normalizedTitle = latestTitleRef.current.trim() || title.trim()
      const content = editor?.getText({ blockSeparator: '\n\n' }).trim() || ''

      if (!normalizedTitle && !content) {
        setFeedback({ type: 'error', message: '先写标题或正文，再生成内容。' })
        return
      }

      if (isMetadataTargetPending(target)) {
        return
      }

      setFeedback(null)
      setMetadataTargetPending(target, true)

      startBackgroundTask({
        toast,
        errorPrefix: 'AI 生成失败',
        run: async () => {
          const res = await fetch('/api/editor/ai-post-metadata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              target,
              title: normalizedTitle,
              content,
              category,
              description,
              tags,
              currentSlug: normalizePostSlug(slug) || editSlug || '',
            }),
          })

          const data = (await res.json().catch(() => ({}))) as {
            error?: string
            value?: string | string[]
            image?: { url?: string }
          }

          if (!res.ok) {
            throw new Error(data.error || 'AI 生成失败')
          }

          return data
        },
        onSuccess: (data) => {
          if (target === 'summary') {
            const nextDescription =
              typeof data.value === 'string' ? data.value.trim() : ''
            if (!nextDescription) {
              throw new Error('摘要生成结果为空')
            }
            setDescription(nextDescription)
            markDirty({ description: nextDescription })
            return
          }

          if (target === 'tags') {
            const nextTags = Array.isArray(data.value)
              ? data.value.map((item) => String(item).trim()).filter(Boolean)
              : []

            if (nextTags.length === 0) {
              throw new Error('标签生成结果为空')
            }

            setTagInput('')
            setTags(nextTags)
            markDirty({ tags: nextTags })
            return
          }

          if (target === 'slug') {
            const nextSlug =
              typeof data.value === 'string'
                ? normalizePostSlug(data.value)
                : ''
            if (!nextSlug) {
              throw new Error('slug 生成结果为空')
            }

            setSlug(nextSlug)
            markDirty({ slug: nextSlug })
            return
          }

          const nextCoverImage =
            typeof data.image?.url === 'string' ? data.image.url : ''
          if (!nextCoverImage) {
            throw new Error('封面生成失败')
          }

          setCoverImage(nextCoverImage)
          markDirty({ coverImage: nextCoverImage })
        },
        onError: (message) => {
          setFeedback({ type: 'error', message })
        },
        onSettled: () => {
          setMetadataTargetPending(target, false)
        },
      })
    },
    [
      category,
      description,
      editSlug,
      editorRef,
      isMetadataTargetPending,
      latestTitleRef,
      markDirty,
      setCoverImage,
      setDescription,
      setFeedback,
      setMetadataTargetPending,
      setSlug,
      setTagInput,
      setTags,
      slug,
      tags,
      title,
      toast,
    ],
  )

  return { handleGenerateMetadata, isMetadataTargetPending }
}

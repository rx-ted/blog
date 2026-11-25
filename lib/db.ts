export { getDB, ensureSchema, type Database } from '@/lib/repositories/schema'
export {
  isPubliclyAccessiblePost,
  isSearchIndexablePost,
  type CategoryRow,
  type CountRow,
  type MediaAssetRow,
  type Post,
  type PostAiSnapshotRow,
  type PostCategoryRow,
  type PostWithTags,
  type SettingRow,
  type StatsRow,
} from '@/lib/repositories/types'
export {
  mapPostWithTags,
  normalizePostStatus,
  parsePostTags,
} from '@/lib/repositories/post-mappers'
export {
  createPost,
  deletePost,
  getPostAiSnapshot,
  getPostById,
  getPostBySlug,
  getPosts,
  getPostsByCategory,
  getPostsCount,
  getPostsCountByCategory,
  getStats,
  incrementViewCount,
  permanentlyDeletePost,
  rememberPostSlugAlias,
  restorePost,
  updatePost,
  updatePostBySlug,
} from '@/lib/repositories/posts'
export { searchPosts } from '@/lib/repositories/search'
export {
  createCategory,
  deleteCategory,
  getCategories,
  getPublicCategories,
  updateCategory,
} from '@/lib/repositories/categories'
export {
  getSetting,
  getSettings,
  setSetting,
} from '@/lib/repositories/settings'
export {
  getMediaAssetByUrl,
  linkMediaAssetToArticle,
  listMediaAssets,
  recordAiChatToolAction,
  upsertMediaAsset,
  type ArticleAssetRole,
  type LinkMediaAssetToArticleInput,
  type MediaAsset,
  type MediaAssetSource,
  type RecordAiChatToolActionInput,
  type UpsertMediaAssetInput,
} from '@/lib/repositories/media-assets'
export {
  getAiResearchJobByNoteId,
  getAiResearchJobByTaskId,
  getAiResearchResourceByCanonicalUrl,
  getAiResearchResourceById,
  getLatestAiResearchJobForResource,
  linkAiResearchResource,
  normalizeResearchUrl,
  upsertAiResearchJob,
  upsertAiResearchResource,
  type AiResearchJob,
  type AiResearchJobStatus,
  type AiResearchLinkRole,
  type AiResearchResource,
  type AiResearchResourceStatus,
  type AiResearchSourceType,
  type LinkAiResearchResourceInput,
  type UpsertAiResearchJobInput,
  type UpsertAiResearchResourceInput,
} from '@/lib/repositories/ai-research'

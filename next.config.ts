import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'
import type { NextConfig } from 'next'
import { PHASE_PRODUCTION_BUILD } from 'next/constants'

const DISABLE_CLOUDFLARE_CONTEXT_DURING_BUILD =
  'QMBLOG_DISABLE_CLOUDFLARE_CONTEXT_DURING_BUILD'

const nextConfig: NextConfig = {
  // 图片优化（Cloudflare 有自己的优化）
  images: {
    unoptimized: true,
  },

  turbopack: {
    root: resolve(process.cwd()),
  },

  // 移除客户端环境变量暴露（安全风险）
  // 敏感信息应该只在服务端使用

  // 减少构建时的 worker 数量，避免 MaxListenersExceededWarning
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
}

const resolveDevWranglerConfig = () => {
  const localConfig = resolve(process.cwd(), 'wrangler.local.jsonc')
  if (existsSync(localConfig)) return localConfig
  const prodConfig = resolve(process.cwd(), 'wrangler.prod.jsonc')
  if (existsSync(prodConfig)) return prodConfig
  return resolve(process.cwd(), 'wrangler.jsonc')
}

const createNextConfig = (phase: string) => {
  const isProductionBuild = phase === PHASE_PRODUCTION_BUILD
  if (isProductionBuild) {
    process.env[DISABLE_CLOUDFLARE_CONTEXT_DURING_BUILD] = 'true'
  }

  void initOpenNextCloudflareForDev({
    configPath: resolveDevWranglerConfig(),
    remoteBindings:
      !isProductionBuild && process.env.NEXT_DEV_REMOTE_BINDINGS === 'true',
  })

  return nextConfig
}

export default createNextConfig

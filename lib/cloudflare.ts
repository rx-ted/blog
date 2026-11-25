import {
  getCloudflareContext,
  type CloudflareContext,
} from '@opennextjs/cloudflare'

const DISABLE_CLOUDFLARE_CONTEXT_DURING_BUILD =
  'QMBLOG_DISABLE_CLOUDFLARE_CONTEXT_DURING_BUILD'

type AppExecutionContext = {
  exports?: Record<string, unknown>
  props?: Record<string, unknown>
  waitUntil?: (promise: Promise<unknown>) => void
  passThroughOnException?: () => void
}

type AppCloudflareContext = CloudflareContext<
  Record<string, unknown>,
  AppExecutionContext
>

export async function getAppCloudflareContext(): Promise<AppCloudflareContext> {
  if (process.env[DISABLE_CLOUDFLARE_CONTEXT_DURING_BUILD] === 'true') {
    return {
      env: {} as CloudflareEnv,
      cf: undefined,
      ctx: {
        exports: {},
        props: {},
        waitUntil: () => undefined,
        passThroughOnException: () => undefined,
      },
    }
  }

  return getCloudflareContext<Record<string, unknown>, AppExecutionContext>({
    async: true,
  })
}

export async function getAppCloudflareEnv(): Promise<CloudflareEnv> {
  return (await getAppCloudflareContext()).env as CloudflareEnv
}

// 参考：https://opennext.js.org/cloudflare/howtos/custom-worker
import { default as handler } from './open-next-handler.js'

import {
  consumeBackgroundJobBatch,
  type BackgroundJob,
  type BackgroundJobEnv,
} from './lib/background-jobs'
import { respondWithPublicEdgeCache } from './lib/edge-response-cache'

interface QueueMessage<T> {
  body: T
  ack?: () => void
  retry?: () => void
}

interface QueueBatch<T> {
  messages: Array<QueueMessage<T>>
}

interface WorkerExecutionContext {
  waitUntil?: (promise: Promise<unknown>) => void
  passThroughOnException?: () => void
}

const customWorker = {
  fetch(request: Request, env: CloudflareEnv, ctx: WorkerExecutionContext) {
    return respondWithPublicEdgeCache(
      request,
      env,
      ctx,
      (nextRequest, nextEnv, nextCtx) =>
        handler.fetch(nextRequest, nextEnv, nextCtx),
    )
  },

  async queue(batch: QueueBatch<BackgroundJob>, env: BackgroundJobEnv) {
    await consumeBackgroundJobBatch(batch, env)
  },
}

export default customWorker

export { DOQueueHandler, DOShardedTagCache } from './open-next-handler.js'

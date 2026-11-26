type WorkerContext = {
  waitUntil?: (promise: Promise<unknown>) => void
  passThroughOnException?: () => void
}

type WorkerFetch = (
  request: Request,
  env: unknown,
  ctx: WorkerContext,
) => Promise<Response>

declare const handler: {
  fetch: WorkerFetch
}

export default handler
export declare const DOQueueHandler: unknown
export declare const DOShardedTagCache: unknown

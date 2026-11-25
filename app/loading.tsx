export default function Loading() {
  return (
    <main
      className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6"
      aria-label="正在加载"
    >
      <div className="space-y-8">
        {Array.from({ length: 5 }).map((_, index) => (
          <article
            key={index}
            className="grid grid-cols-[56px_1fr] gap-5 border-t border-[var(--editor-line)] pt-7 sm:grid-cols-[72px_1fr] sm:gap-7"
          >
            <div className="space-y-2 pt-1">
              <div className="h-3 w-10 animate-pulse rounded-sm bg-[var(--editor-soft)]" />
              <div className="h-3 w-8 animate-pulse rounded-sm bg-[var(--editor-soft)]" />
            </div>
            <div className="min-w-0 space-y-3">
              <div className="h-3 w-20 animate-pulse rounded-sm bg-[var(--editor-soft)]" />
              <div className="h-6 w-4/5 animate-pulse rounded-sm bg-[var(--editor-soft)]" />
              <div className="space-y-2">
                <div className="h-3 w-full animate-pulse rounded-sm bg-[var(--editor-soft)]" />
                <div className="h-3 w-11/12 animate-pulse rounded-sm bg-[var(--editor-soft)]" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  )
}

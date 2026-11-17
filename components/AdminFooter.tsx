export function AdminFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--editor-line)] bg-[var(--editor-panel)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4">
        <div className="flex items-center justify-center text-xs text-[var(--stone-gray)]">
          <span>MIT License</span>
          <span>© 2022 - {new Date().getFullYear()}</span>
          <span className="mx-2">·</span>
          <span>rx-ted</span>
        </div>
      </div>
    </footer>
  )
}

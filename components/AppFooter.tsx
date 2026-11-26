import type { ReactNode } from 'react'

interface AppFooterProps {
  className?: string
  containerClassName?: string
  children?: ReactNode
}

export function AppFooter({
  className = '',
  containerClassName = 'mx-auto max-w-6xl px-4 sm:px-6 py-4',
  children,
}: AppFooterProps) {
  const year = new Date().getFullYear()

  return (
    <footer
      className={`mt-auto border-t border-[var(--editor-line)] bg-[var(--editor-panel)] ${className}`.trim()}
    >
      <div className={containerClassName}>
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-[var(--stone-gray)]">
          <span>MIT License</span>
          <span>© 2022 - {year}</span>
          <span>·</span>
          <a
            href="https://github.com/rx-ted"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--editor-ink)] transition-colors duration-150 underline-offset-2 hover:underline"
          >
            rx-ted
          </a>
          {children}
        </div>
      </div>
    </footer>
  )
}

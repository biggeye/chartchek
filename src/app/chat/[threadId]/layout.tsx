import { Suspense } from 'react'

export default function ChatThreadLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full flex-1 flex-col">
      <Suspense
        fallback={
          <div className="flex-1 overflow-hidden bg-zinc-50 dark:bg-zinc-900">
            <div className="flex h-full flex-1 flex-col items-center justify-center p-4">
              <div className="h-32 w-32 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Loading chat...</p>
            </div>
          </div>
        }
      >
        {children}
      </Suspense>
    </div>
  )
}

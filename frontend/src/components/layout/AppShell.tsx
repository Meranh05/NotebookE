'use client'

import { usePathname } from 'next/navigation'
import { AppSidebar } from './AppSidebar'
import { SetupBanner } from './SetupBanner'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const isImmersiveSource = /^\/sources\/[^/]+/.test(pathname ?? '')

  if (isImmersiveSource) {
    return <div className="h-screen min-w-0 overflow-hidden">{children}</div>
  }

  return (
    <div className="flex h-screen min-w-0 overflow-hidden">
      <AppSidebar />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <SetupBanner />
        {children}
      </main>
    </div>
  )
}

'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/hooks/use-auth'
import { useSidebarStore } from '@/lib/stores/sidebar-store'
import { useCreateDialogs } from '@/lib/hooks/use-create-dialogs'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { LanguageToggle } from '@/components/common/LanguageToggle'
import type { TFunction } from 'i18next'
import { useTranslation } from '@/lib/hooks/use-translation'
import { IconAdjustmentsHorizontal, IconArrowsRightLeft, IconBook, IconBook2, IconBooks, IconBoxModel, IconChevronLeft, IconCommand, IconCpu, IconFileText, IconHeadphones, IconLogout, IconMenu2, IconMicrophone, IconPlus, IconSparkles, IconVideo } from '@tabler/icons-react'

const getNavigation = (t: TFunction): NavigationSection[] => [
  {
    title: t('navigation.collect'),
    items: [
      { name: t('navigation.sources'), href: '/sources', icon: IconBooks },
    ],
  },
  {
    title: t('navigation.process'),
    items: [
      { name: t('navigation.notebooks'), href: '/notebooks', icon: IconBook2 },
      { name: t('navigation.askAndSearch'), href: '/search', icon: IconSparkles },
    ],
  },
  {
    title: t('navigation.create'),
    items: [
      { name: t('navigation.podcasts'), href: '/podcasts', icon: IconHeadphones },
      { name: t('navigation.videos'), href: '/videos', icon: IconVideo },
    ],
  },
  {
    title: t('navigation.manage'),
    items: [
      { name: t('navigation.models'), href: '/settings/api-keys', icon: IconCpu },
      { name: t('navigation.transformations'), href: '/transformations', icon: IconArrowsRightLeft },
      { name: t('navigation.settings'), href: '/settings', icon: IconAdjustmentsHorizontal },
      { name: t('navigation.advanced'), href: '/advanced', icon: IconBoxModel },
    ],
  },
]

// Unified Logo component for both states
function AppLogo({ size = 32 }: { size?: number }) {
  return (
    <Image
      src="/logo.svg"
      alt="NotebookE"
      width={size}
      height={size}
      className="flex-shrink-0 object-contain dark:invert dark:brightness-200"
      priority
      unoptimized
    />
  )
}

type CreateTarget = 'source' | 'notebook' | 'podcast'

type NavigationItem = {
  name: string
  href: string
  icon: typeof IconBooks
}

type NavigationSection = {
  title: string
  items: NavigationItem[]
}

const navigationIconTone: Record<string, string> = {
  '/sources': 'text-amber-600 dark:text-amber-400',
  '/notebooks': 'text-indigo-600 dark:text-indigo-400',
  '/search': 'text-violet-600 dark:text-violet-400',
  '/podcasts': 'text-fuchsia-600 dark:text-fuchsia-400',
  '/videos': 'text-sky-600 dark:text-sky-400',
  '/settings/api-keys': 'text-emerald-600 dark:text-emerald-400',
  '/transformations': 'text-orange-600 dark:text-orange-400',
  '/settings': 'text-slate-600 dark:text-slate-300',
  '/advanced': 'text-rose-600 dark:text-rose-400',
}

export function AppSidebar() {
  const { t } = useTranslation()
  const navigation = useMemo(() => getNavigation(t), [t])
  const pathname = usePathname()
  const activeHref = useMemo(() => {
    return navigation
      .flatMap((section) => section.items)
      .map((item) => item.href)
      .filter((href) => pathname === href || pathname?.startsWith(`${href}/`))
      .sort((left, right) => right.length - left.length)[0]
  }, [navigation, pathname])
  const { logout } = useAuth()
  const { isCollapsed, toggleCollapse } = useSidebarStore()
  const canExpandSidebar = useMediaQuery('(min-width: 1024px)')
  const showCollapsed = isCollapsed || !canExpandSidebar
  const { openSourceDialog, openNotebookDialog, openPodcastDialog } = useCreateDialogs()

  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const [isMac, setIsMac] = useState(true) // Default to Mac for SSR

  // Detect platform for keyboard shortcut display
  useEffect(() => {
    setIsMac(navigator.platform.toLowerCase().includes('mac'))
  }, [])

  const handleCreateSelection = (target: CreateTarget) => {
    setCreateMenuOpen(false)

    if (target === 'source') {
      openSourceDialog()
    } else if (target === 'notebook') {
      openNotebookDialog()
    } else if (target === 'podcast') {
      openPodcastDialog()
    }
  }

  return (
    <TooltipProvider delayDuration={120}>
      <div
        className={cn(
          'app-sidebar flex h-full flex-shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out',
          showCollapsed ? 'w-16' : 'w-60'
        )}
      >
        <div
          className={cn(
            'group flex items-center border-b border-sidebar-border/70',
            showCollapsed ? 'h-16 justify-center px-2' : 'h-[68px] justify-between px-3.5'
          )}
        >
          {showCollapsed ? (
            // Collapsed: square icon logo centered, toggle appears on hover
            <div className="relative flex items-center justify-center w-full h-full">
              <div className="transition-opacity duration-200 group-hover:opacity-10">
                <AppLogo size={28} />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleCollapse}
                className="absolute text-sidebar-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                data-testid="sidebar-toggle"
              >
                <IconMenu2 className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            // Expanded: logo mark + "NotebookE" text + collapse button
            <>
              <div className="flex min-w-0 items-center gap-2.5">
                <AppLogo size={30} />
                <span className="whitespace-nowrap font-display text-[19px] font-bold tracking-[-0.02em] text-sidebar-foreground">
                  {t('common.appName')}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleCollapse}
                className="h-8 w-8 flex-shrink-0 rounded-lg p-0 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                data-testid="sidebar-toggle"
              >
                <IconChevronLeft className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        <nav
          className={cn(
            'flex-1 space-y-1 overflow-y-auto py-3',
            showCollapsed ? 'px-2' : 'px-2.5'
          )}
        >
          <div
            className={cn(
              'mb-5',
              showCollapsed ? 'px-0' : 'px-0'
            )}
          >
            <DropdownMenu open={createMenuOpen} onOpenChange={setCreateMenuOpen}>
              {showCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        onClick={() => setCreateMenuOpen(true)}
                        className="h-10 w-full justify-center rounded-md bg-primary px-2 font-display font-bold text-primary-foreground hover:bg-primary-hover"
                        aria-label={t('common.create')}
                      >
                        <IconPlus className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                   <TooltipContent side="right">{t('common.create')}</TooltipContent>
                </Tooltip>
              ) : (
                <DropdownMenuTrigger asChild>
                  <Button
                    onClick={() => setCreateMenuOpen(true)}
                    className="h-10 w-full justify-start rounded-md bg-primary px-3 font-display text-[13px] font-semibold text-primary-foreground hover:bg-primary-hover"
                   >
                    <IconPlus className="h-4 w-4 mr-2" />
                    {t('common.create')}
                  </Button>
                </DropdownMenuTrigger>
              )}

              <DropdownMenuContent
                align={showCollapsed ? 'end' : 'start'}
                side={showCollapsed ? 'right' : 'bottom'}
                className="w-48"
              >
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault()
                    handleCreateSelection('source')
                  }}
                  className="gap-2"
                >
                   <IconFileText className="h-4 w-4" />
                  {t('common.source')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault()
                    handleCreateSelection('notebook')
                  }}
                  className="gap-2"
                >
                   <IconBook className="h-4 w-4" />
                  {t('common.notebook')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault()
                    handleCreateSelection('podcast')
                  }}
                  className="gap-2"
                >
                   <IconMicrophone className="h-4 w-4" />
                  {t('common.podcast')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {navigation.map((section, index) => (
            <div key={section.title} className={index > 0 ? "mt-4" : ""}>
              <div className="space-y-1">
                {!showCollapsed && (
                  <h3 className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                    {section.title}
                  </h3>
                )}

                {section.items.map((item) => {
                  const isActive = activeHref === item.href
                  const navigationLink = (
                    <Link
                      key={item.name}
                      href={item.href}
                      aria-label={showCollapsed ? item.name : undefined}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'relative flex h-9 w-full items-center gap-2.5 rounded-md text-[13px] font-medium text-sidebar-foreground/70 outline-none transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                        isActive &&
                          (showCollapsed
                            ? 'border border-sidebar-border bg-sidebar-accent text-sidebar-foreground'
                            : 'border-l-2 border-sidebar-foreground/70 bg-sidebar-accent pl-2.5 text-sidebar-foreground'),
                        showCollapsed ? 'justify-center px-2' : 'justify-start px-3'
                      )}
                    >
                      <item.icon className={cn('h-5 w-5', navigationIconTone[item.href], isActive ? 'opacity-100' : 'opacity-75')} />
                      {!showCollapsed && <span>{item.name}</span>}
                    </Link>
                  )

                  if (showCollapsed) {
                    return (
                      <Tooltip key={item.name}>
                        <TooltipTrigger asChild>
                          {navigationLink}
                        </TooltipTrigger>
                        <TooltipContent side="right">{item.name}</TooltipContent>
                      </Tooltip>
                    )
                  }

                  return navigationLink
                })}
              </div>
            </div>
          ))}
        </nav>

        <div
          className={cn(
            'space-y-2 border-t border-sidebar-border/70 p-2.5',
            showCollapsed && 'px-2'
          )}
        >
          {/* IconCommand Palette hint */}
          {!showCollapsed && (
            <div 
              className="mb-2 flex cursor-pointer items-center justify-between rounded-md border border-border/60 bg-surface-recessed p-2.5 text-sm text-sidebar-foreground/70 transition-colors hover:border-border hover:bg-surface-sunken group"
              onClick={() => {
                const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true });
                document.dispatchEvent(event);
              }}
            >
              <div className="flex items-center gap-2.5">
                <IconCommand className="h-4 w-4 opacity-70 transition-opacity group-hover:opacity-100" />
                <span className="font-medium text-[13px]">{t('common.quickActions')}</span>
              </div>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded-[4px] border border-border/80 bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                {isMac ? <span className="text-xs">⌘</span> : <span className="text-[10px]">Ctrl</span>}K
              </kbd>
            </div>
          )}

           <div
            className={cn(
              'flex flex-col gap-2',
              showCollapsed ? 'items-center' : 'items-stretch'
            )}
          >
            {showCollapsed ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <ThemeToggle iconOnly />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">{t('common.theme')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <LanguageToggle iconOnly />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">{t('common.language')}</TooltipContent>
                </Tooltip>
              </>
            ) : (
              <>
                <ThemeToggle />
                <LanguageToggle />
              </>
            )}
          </div>

          {showCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-9 w-full justify-center rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  onClick={logout}
                  aria-label={t('common.signOut')}
                >
                  <IconLogout className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
               <TooltipContent side="right">{t('common.signOut')}</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              className="h-9 w-full justify-start gap-2.5 rounded-lg px-3 text-[13px] font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              onClick={logout}
              aria-label={t('common.signOut')}
             >
              <IconLogout className="h-5 w-5 opacity-70" />
              {t('common.signOut')}
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

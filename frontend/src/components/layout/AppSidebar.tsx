'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/hooks/use-auth'
import { useSidebarStore } from '@/lib/stores/sidebar-store'
import { useCreateDialogs } from '@/lib/hooks/use-create-dialogs'
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
import { Separator } from '@/components/ui/separator'
import { IconAdjustmentsHorizontal, IconArrowsRightLeft, IconBook, IconBook2, IconBooks, IconBoxModel, IconChevronLeft, IconCommand, IconCpu, IconFileText, IconHeadphones, IconLogout, IconMenu2, IconMicrophone, IconPlus, IconSparkles } from '@tabler/icons-react'

const getNavigation = (t: TFunction) => [
  {
    title: t('navigation.collect'),
    items: [
      { name: t('navigation.sources'), href: '/sources', icon: IconBooks, iconClass: 'text-sage' },
    ],
  },
  {
    title: t('navigation.process'),
    items: [
      { name: t('navigation.notebooks'), href: '/notebooks', icon: IconBook2, iconClass: 'text-teal' },
      { name: t('navigation.askAndSearch'), href: '/search', icon: IconSparkles, iconClass: undefined },
    ],
  },
  {
    title: t('navigation.create'),
    items: [
      { name: t('navigation.podcasts'), href: '/podcasts', icon: IconHeadphones, iconClass: 'text-mauve' },
    ],
  },
  {
    title: t('navigation.manage'),
    items: [
      { name: t('navigation.models'), href: '/settings/api-keys', icon: IconCpu, iconClass: undefined },
      { name: t('navigation.transformations'), href: '/transformations', icon: IconArrowsRightLeft, iconClass: undefined },
      { name: t('navigation.settings'), href: '/settings', icon: IconAdjustmentsHorizontal, iconClass: undefined },
      { name: t('navigation.advanced'), href: '/advanced', icon: IconBoxModel, iconClass: undefined },
    ],
  },
] as const

// Unified Logo component for both states
function AppLogo({ size = 32 }: { size?: number }) {
  return (
    <Image
      src="/logo.png"
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

export function AppSidebar() {
  const { t } = useTranslation()
  const navigation = getNavigation(t)
  const pathname = usePathname()
  const { logout } = useAuth()
  const { isCollapsed, toggleCollapse } = useSidebarStore()
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
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          'app-sidebar flex h-full flex-col bg-sidebar border-sidebar-border border-r transition-all duration-300',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        <div
          className={cn(
            'flex items-center group',
            isCollapsed ? 'h-16 justify-center px-2' : 'h-20 justify-between px-4'
          )}
        >
          {isCollapsed ? (
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
              >
                <IconMenu2 className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            // Expanded: logo.png + "NotebookE" text + collapse button
            <>
              <div className="flex items-center gap-3 min-w-0">
                <AppLogo size={32} />
                <span className="font-display text-[22px] font-extrabold tracking-tight text-sidebar-foreground whitespace-nowrap">
                  NotebookE
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleCollapse}
                className="text-sidebar-foreground hover:bg-sidebar-accent flex-shrink-0"
                data-testid="sidebar-toggle"
              >
                <IconChevronLeft className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        <nav
          className={cn(
            'flex-1 space-y-1 py-4',
            isCollapsed ? 'px-2' : 'px-3'
          )}
        >
          <div
            className={cn(
              'mb-4',
              isCollapsed ? 'px-0' : 'px-0'
            )}
          >
            <DropdownMenu open={createMenuOpen} onOpenChange={setCreateMenuOpen}>
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        onClick={() => setCreateMenuOpen(true)}
                        className="w-full justify-center px-2 font-display font-bold rounded-xl h-10 shadow-sm bg-primary text-primary-foreground hover:bg-primary-hover hover:-translate-y-[1px] transition-all"
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
                    className="w-full justify-start font-display font-medium rounded-xl h-10 shadow-sm px-3 text-[14px] bg-primary text-primary-foreground hover:bg-primary-hover hover:-translate-y-[1px] transition-all"
                   >
                    <IconPlus className="h-4 w-4 mr-2" />
                    {t('common.create')}
                  </Button>
                </DropdownMenuTrigger>
              )}

              <DropdownMenuContent
                align={isCollapsed ? 'end' : 'start'}
                side={isCollapsed ? 'right' : 'bottom'}
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
            <div key={section.title} className={index > 0 ? "mt-5" : ""}>
              <div className="space-y-1">
                {!isCollapsed && (
                  <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </h3>
                )}

                {section.items.map((item) => {
                  const isActive = pathname?.startsWith(item.href) || false
                  const button = (
                    <Button
                      variant="ghost"
                      className={cn(
                        'w-full gap-2.5 text-[14px] font-bold text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200 relative rounded-xl h-10',
                        isActive &&
                          'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary shadow-sm',
                        isCollapsed ? 'justify-center px-2' : 'justify-start px-3'
                      )}
                    >
                      <item.icon className={cn('h-5 w-5', isActive ? 'text-primary' : item.iconClass || 'opacity-70')} />
                      {!isCollapsed && <span>{item.name}</span>}
                    </Button>
                  )

                  if (isCollapsed) {
                    return (
                      <Tooltip key={item.name}>
                        <TooltipTrigger asChild>
                          <Link href={item.href}>
                            {button}
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">{item.name}</TooltipContent>
                      </Tooltip>
                    )
                  }

                  return (
                    <Link key={item.name} href={item.href}>
                      {button}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div
          className={cn(
            'border-t border-sidebar-border p-3 space-y-2',
            isCollapsed && 'px-2'
          )}
        >
          {/* IconCommand Palette hint */}
          {!isCollapsed && (
            <div 
              className="mb-2 flex items-center justify-between rounded-xl border border-border/60 bg-surface-recessed p-2.5 text-sm text-sidebar-foreground/70 hover:bg-surface-sunken hover:border-border transition-all cursor-pointer shadow-sm group"
              onClick={() => {
                const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true });
                document.dispatchEvent(event);
              }}
            >
              <div className="flex items-center gap-2.5">
                <IconCommand className="h-4 w-4 opacity-70 group-hover:text-primary transition-colors" />
                <span className="font-medium text-[13px]">{t('common.quickActions')}</span>
              </div>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded-[4px] border border-border/80 bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground shadow-sm">
                {isMac ? <span className="text-xs">⌘</span> : <span className="text-[10px]">Ctrl</span>}K
              </kbd>
            </div>
          )}

           <div
            className={cn(
              'flex flex-col gap-2',
              isCollapsed ? 'items-center' : 'items-stretch'
            )}
          >
            {isCollapsed ? (
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

          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-center h-10 rounded-xl text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
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
              className="w-full justify-start gap-2.5 h-10 rounded-xl px-3 text-[14px] font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200"
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

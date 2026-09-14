'use client'

import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Icon, IconChevronLeft } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/lib/hooks/use-media-query'

interface CollapsibleColumnProps {
  isCollapsed: boolean
  onToggle: () => void
  collapsedIcon: Icon
  collapsedLabel: string
  collapsedContent?: ReactNode
  children: ReactNode
}

export function CollapsibleColumn({
  isCollapsed,
  onToggle,
  collapsedIcon: CollapsedIcon,
  collapsedLabel,
  collapsedContent,
  children,
}: CollapsibleColumnProps) {
  const canCollapse = useMediaQuery('(min-width: 1440px)')
  const isCJK = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(collapsedLabel);

  if (isCollapsed && canCollapse) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onToggle}
              className={cn(
                'flex flex-col items-center gap-3',
                'w-12 h-full min-h-0',
                'border rounded-lg',
                'bg-card hover:bg-accent/50',
                'transition-all duration-150',
                'cursor-pointer group',
                collapsedContent ? 'justify-start gap-2 py-3' : 'justify-center py-6'
              )}
              aria-label={`Expand ${collapsedLabel}`}
            >
              {collapsedContent ? (
                <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-2 overflow-y-auto overflow-x-hidden px-1">
                  <CollapsedIcon className="mb-1 h-4 w-4 flex-shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                  <div className="h-px w-6 flex-shrink-0 bg-border" />
                  {collapsedContent}
                </div>
              ) : (
                <CollapsedIcon className="h-5 w-5 flex-shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
              )}
              <div
                className={cn(
                  'text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors whitespace-nowrap',
                  collapsedContent && 'sr-only'
                )}
                style={{ writingMode: 'vertical-rl', transform: isCJK ? 'none' : 'rotate(180deg)', textOrientation: 'mixed' }}
              >
                {collapsedLabel}
              </div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Expand {collapsedLabel}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className="h-full min-h-0 transition-all duration-150">
      {children}
    </div>
  )
}

// Factory function to create a collapse button for card headers
export function createCollapseButton(onToggle: () => void, label: string) {
  return (
    <div className="hidden min-[1440px]:block">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                onToggle()
              }}
              className="h-7 w-7 hover:bg-accent"
              aria-label={`Collapse ${label}`}
            >
              <IconChevronLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Collapse {label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

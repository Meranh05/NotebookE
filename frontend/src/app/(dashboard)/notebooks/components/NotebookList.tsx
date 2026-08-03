'use client'

import { NotebookResponse } from '@/lib/types/api'
import { NotebookCard } from './NotebookCard'
import { NotebookRow } from './NotebookRow'
import { useNotebookViewStore } from '@/lib/stores/notebook-view-store'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { IconBook, IconChevronDown, IconChevronRight, IconPlus } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useTranslation } from '@/lib/hooks/use-translation'

interface NotebookListProps {
  notebooks?: NotebookResponse[]
  isLoading: boolean
  title: string
  collapsible?: boolean
  emptyTitle?: string
  emptyDescription?: string
  onAction?: () => void
  actionLabel?: string
}

export function NotebookList({ 
  notebooks, 
  isLoading, 
  title, 
  collapsible = false,
  emptyTitle,
  emptyDescription,
  onAction,
  actionLabel,
}: NotebookListProps) {
  const { t } = useTranslation()
  const viewMode = useNotebookViewStore((state) => state.viewMode)
  const [isExpanded, setIsExpanded] = useState(!collapsible)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!notebooks || notebooks.length === 0) {
    return (
      <EmptyState
        icon={IconBook}
        title={emptyTitle ?? t('common.noResults')}
        description={emptyDescription ?? t('chat.startByCreating')}
        action={onAction && actionLabel ? (
          <Button onClick={onAction} variant="outline" className="mt-4">
            <IconPlus className="h-4 w-4 mr-2" />
            {actionLabel}
          </Button>
        ) : undefined}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {collapsible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <IconChevronDown className="h-4 w-4" />
            ) : (
              <IconChevronRight className="h-4 w-4" />
            )}
          </Button>
        )}
        <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
        <span className="text-sm text-muted-foreground">({notebooks.length})</span>
      </div>

      {isExpanded && (
        viewMode === 'list' ? (
          <div className="flex flex-col gap-2">
            {onAction && actionLabel && (
              <div
                onClick={onAction}
                className="group relative flex items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/50 px-5 py-4 transition-all duration-300 hover:bg-surface-raised hover:-translate-y-1 hover:border-primary/50 cursor-pointer"
              >
                <IconPlus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="font-display font-medium text-base text-muted-foreground group-hover:text-primary transition-colors">
                  {actionLabel}
                </span>
              </div>
            )}
            {notebooks.map((notebook) => (
              <NotebookRow key={notebook.id} notebook={notebook} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {onAction && actionLabel && (
              <div
                onClick={onAction}
                className="group relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border/80 bg-card hover:bg-surface-sunken hover:border-foreground/30 transition-all duration-300 min-h-[180px] cursor-pointer shadow-sm"
              >
                <div className="flex flex-col items-center gap-3 text-muted-foreground group-hover:text-primary transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background shadow-sm group-hover:scale-110 transition-transform duration-300">
                    <IconPlus className="h-5 w-5" />
                  </div>
                  <span className="font-display font-semibold text-[14px]">
                    {actionLabel}
                  </span>
                </div>
              </div>
            )}
            {notebooks.map((notebook) => (
              <NotebookCard key={notebook.id} notebook={notebook} />
            ))}
          </div>
        )
      )}
    </div>
  )
}

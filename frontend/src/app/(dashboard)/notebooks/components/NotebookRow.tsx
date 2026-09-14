'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { NotebookResponse } from '@/lib/types/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { IconArchive, IconArchiveOff, IconBook2, IconChevronRight, IconDots, IconFileText, IconNote, IconTrash } from '@tabler/icons-react'
import { formatDistanceToNow } from 'date-fns'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUpdateNotebook } from '@/lib/hooks/use-notebooks'
import { NotebookDeleteDialog } from './NotebookDeleteDialog'
import { useState } from 'react'
import { useTranslation } from '@/lib/hooks/use-translation'
import { getDateLocale } from '@/lib/utils/date-locale'

interface NotebookRowProps {
  notebook: NotebookResponse
}

const NOTEBOOK_ROW_TONES = [
  'border-indigo-100 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/35 dark:text-indigo-300',
  'border-teal-100 bg-teal-50 text-teal-700 dark:border-teal-900/60 dark:bg-teal-950/35 dark:text-teal-300',
  'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300',
  'border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-300',
  'border-sky-100 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-300',
  'border-orange-100 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/35 dark:text-orange-300',
  'border-cyan-100 bg-cyan-50 text-cyan-700 dark:border-cyan-900/60 dark:bg-cyan-950/35 dark:text-cyan-300',
  'border-lime-100 bg-lime-50 text-lime-700 dark:border-lime-900/60 dark:bg-lime-950/35 dark:text-lime-300',
  'border-fuchsia-100 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-900/60 dark:bg-fuchsia-950/35 dark:text-fuchsia-300',
  'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300',
]

const NOTEBOOK_ROW_SURFACES = [
  'bg-indigo-50/40 dark:bg-indigo-950/20', 'bg-teal-50/40 dark:bg-teal-950/20',
  'bg-amber-50/40 dark:bg-amber-950/20', 'bg-rose-50/40 dark:bg-rose-950/20',
  'bg-sky-50/40 dark:bg-sky-950/20', 'bg-orange-50/40 dark:bg-orange-950/20',
  'bg-cyan-50/40 dark:bg-cyan-950/20', 'bg-lime-50/40 dark:bg-lime-950/20',
  'bg-fuchsia-50/40 dark:bg-fuchsia-950/20', 'bg-emerald-50/40 dark:bg-emerald-950/20',
]

export function NotebookRow({ notebook }: NotebookRowProps) {
  const { t, language } = useTranslation()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const router = useRouter()
  const updateNotebook = useUpdateNotebook()
  const toneIndex = [...notebook.name].reduce((sum, character) => sum + character.charCodeAt(0), 0) % NOTEBOOK_ROW_TONES.length
  const iconTone = NOTEBOOK_ROW_TONES[toneIndex]
  const surfaceTone = NOTEBOOK_ROW_SURFACES[toneIndex]

  const handleArchiveToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateNotebook.mutate({
      id: notebook.id,
      data: { archived: !notebook.archived }
    })
  }

  const handleRowClick = () => {
    router.push(`/notebooks/${encodeURIComponent(notebook.id)}`)
  }

  return (
    <>
      {/* The row is mouse-clickable for convenience, but the notebook name is
          the accessible primary action (a real link) for keyboard/screen-reader
          users — avoiding nested interactive (button-in-button) semantics. */}
      <div
        className={`group relative flex min-h-[72px] items-center gap-3 rounded-2xl border border-border/80 px-3 py-3 shadow-sm transition-[border-color,box-shadow,background-color] duration-150 hover:border-border hover:shadow-md sm:gap-4 sm:px-4 ${surfaceTone}`}
        onClick={handleRowClick}
        style={{ cursor: 'pointer' }}
      >
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${iconTone}`}>
          <IconBook2 className="h-[18px] w-[18px]" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Link
              href={`/notebooks/${encodeURIComponent(notebook.id)}`}
              onClick={(e) => e.stopPropagation()}
              className="truncate rounded-sm font-display text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-[15px]"
            >
              {notebook.name}
            </Link>
            {notebook.archived && (
              <Badge variant="secondary" className="bg-background text-[9px] px-1.5 py-0">
                {t('notebooks.archived')}
              </Badge>
            )}
          </div>
          {notebook.description && (
            <p className="mb-1 truncate text-xs text-muted-foreground">
              {notebook.description}
            </p>
          )}
          <div className="flex items-center gap-3 text-[11px] font-medium text-muted-foreground">
            <span>
              {formatDistanceToNow(new Date(notebook.updated), { 
                addSuffix: true,
                locale: getDateLocale(language)
              })}
            </span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-[10px] font-medium">
                <IconFileText className="h-3 w-3" />
                <span>{notebook.source_count}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-medium">
                <IconNote className="h-3 w-3" />
                <span>{notebook.note_count}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label={t('common.actions')}
                variant="ghost"
                size="sm"
                className="h-8 w-8 shrink-0 rounded-lg p-0 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 focus-visible:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <IconDots className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} className="w-48 shadow-pop border-muted-foreground/10">
              <DropdownMenuItem onClick={handleArchiveToggle} className="cursor-pointer">
              {notebook.archived ? (
                <>
                  <IconArchiveOff className="h-4 w-4 mr-2 text-muted-foreground" />
                  {t('notebooks.unarchive')}
                </>
              ) : (
                <>
                  <IconArchive className="h-4 w-4 mr-2 text-muted-foreground" />
                  {t('notebooks.archive')}
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                setShowDeleteDialog(true)
              }}
              className="text-destructive focus:bg-destructive/10 cursor-pointer"
            >
              <IconTrash className="h-4 w-4 mr-2" />
              {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
          </DropdownMenu>
          <IconChevronRight className="h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
        </div>
    </div>

    <NotebookDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        notebookId={notebook.id}
        notebookName={notebook.name}
      />
    </>
  )
}

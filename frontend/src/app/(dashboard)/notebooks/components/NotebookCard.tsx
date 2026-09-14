'use client'

import { useRouter } from 'next/navigation'
import { NotebookResponse } from '@/lib/types/api'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
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
interface NotebookCardProps {
  notebook: NotebookResponse
}

const NOTEBOOK_TONES = [
  { icon: 'border-indigo-100 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/35 dark:text-indigo-300', surface: 'bg-indigo-50/40 dark:bg-indigo-950/20' },
  { icon: 'border-teal-100 bg-teal-50 text-teal-700 dark:border-teal-900/60 dark:bg-teal-950/35 dark:text-teal-300', surface: 'bg-teal-50/40 dark:bg-teal-950/20' },
  { icon: 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300', surface: 'bg-amber-50/40 dark:bg-amber-950/20' },
  { icon: 'border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-300', surface: 'bg-rose-50/40 dark:bg-rose-950/20' },
  { icon: 'border-sky-100 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-300', surface: 'bg-sky-50/40 dark:bg-sky-950/20' },
  { icon: 'border-orange-100 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/35 dark:text-orange-300', surface: 'bg-orange-50/40 dark:bg-orange-950/20' },
  { icon: 'border-cyan-100 bg-cyan-50 text-cyan-700 dark:border-cyan-900/60 dark:bg-cyan-950/35 dark:text-cyan-300', surface: 'bg-cyan-50/40 dark:bg-cyan-950/20' },
  { icon: 'border-lime-100 bg-lime-50 text-lime-700 dark:border-lime-900/60 dark:bg-lime-950/35 dark:text-lime-300', surface: 'bg-lime-50/40 dark:bg-lime-950/20' },
  { icon: 'border-fuchsia-100 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-900/60 dark:bg-fuchsia-950/35 dark:text-fuchsia-300', surface: 'bg-fuchsia-50/40 dark:bg-fuchsia-950/20' },
  { icon: 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300', surface: 'bg-emerald-50/40 dark:bg-emerald-950/20' },
]

function getNotebookTone(name: string) {
  const index = [...name].reduce((sum, character) => sum + character.charCodeAt(0), 0) % NOTEBOOK_TONES.length
  return NOTEBOOK_TONES[index]
}

export function NotebookCard({ notebook }: NotebookCardProps) {
  const { t, language } = useTranslation()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const router = useRouter()
  const updateNotebook = useUpdateNotebook()
  const tone = getNotebookTone(notebook.name)

  const handleArchiveToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateNotebook.mutate({
      id: notebook.id,
      data: { archived: !notebook.archived }
    })
  }

  const handleCardClick = () => {
    router.push(`/notebooks/${encodeURIComponent(notebook.id)}`)
  }

  return (
    <>
      <Card 
        className={`group relative flex h-[176px] min-h-0 flex-col gap-2 overflow-hidden rounded-2xl border border-border/80 p-4 shadow-sm transition-[border-color,box-shadow,background-color] duration-150 hover:border-border hover:shadow-md focus-within:ring-2 focus-within:ring-ring/25 ${tone.surface}`}
        onClick={handleCardClick}
        style={{ cursor: 'pointer' }}
      >
        <div className="mb-3 flex items-start justify-between">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${tone.icon}`}>
            <IconBook2 className="h-[18px] w-[18px]" />
          </div>
          
          {/* Action Menu */}
          <div className="flex items-center gap-2">
            {notebook.archived && (
              <Badge variant="secondary" className="px-2 py-0.5 text-[10px] font-medium">
                {t('notebooks.archived')}
              </Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('common.actions')}
                  className="h-8 w-8 rounded-lg text-muted-foreground opacity-70 transition-colors hover:bg-muted hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconDots className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} className="w-48 border-border shadow-pop">
                <DropdownMenuItem onClick={handleArchiveToggle} className="cursor-pointer py-2">
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
                  className="text-destructive focus:bg-destructive/10 cursor-pointer py-2"
                >
                  <IconTrash className="h-4 w-4 mr-2" />
                  {t('common.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col">
          <CardTitle className="mb-1 truncate font-display text-[15px] font-semibold tracking-tight text-foreground">
            {notebook.name}
          </CardTitle>
          <CardDescription className="mb-3 line-clamp-2 min-h-8 text-xs leading-4 text-muted-foreground">
            {notebook.description || <span className="italic opacity-50">{t('chat.noDescription')}</span>}
          </CardDescription>

          <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-3">
            <span className="truncate pr-3 text-[11px] font-medium text-muted-foreground">
              {formatDistanceToNow(new Date(notebook.updated), { 
                addSuffix: true,
                locale: getDateLocale(language)
              })}
            </span>
            <div className="flex shrink-0 items-center gap-2.5 text-muted-foreground">
              <div className="flex items-center gap-1" title="Sources">
                <IconFileText className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium tabular-nums">{notebook.source_count}</span>
              </div>
              <div className="flex items-center gap-1" title="Notes">
                <IconNote className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium tabular-nums">{notebook.note_count}</span>
              </div>
              <IconChevronRight className="h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            </div>
          </div>
        </div>
      </Card>

      <NotebookDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        notebookId={notebook.id}
        notebookName={notebook.name}
      />
    </>
  )
}

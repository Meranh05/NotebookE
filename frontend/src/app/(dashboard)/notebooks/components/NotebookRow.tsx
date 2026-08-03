'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { NotebookResponse } from '@/lib/types/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { IconArchive, IconArchiveOff, IconDots, IconFileText, IconNote, IconTrash } from '@tabler/icons-react'
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

export function NotebookRow({ notebook }: NotebookRowProps) {
  const { t, language } = useTranslation()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const router = useRouter()
  const updateNotebook = useUpdateNotebook()

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
        className="group relative flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 transition-all duration-300 hover:bg-surface-raised hover:-translate-y-1 hover:shadow-pop"
        onClick={handleRowClick}
        style={{ cursor: 'pointer' }}
      >
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href={`/notebooks/${encodeURIComponent(notebook.id)}`}
              onClick={(e) => e.stopPropagation()}
              className="font-display font-medium text-base truncate rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:text-teal transition-colors text-foreground"
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
            <p className="text-sm text-muted-foreground truncate opacity-80 mb-2">
              {notebook.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground font-medium mt-2">
            <span>
              {formatDistanceToNow(new Date(notebook.updated), { 
                addSuffix: true,
                locale: getDateLocale(language)
              })}
            </span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-teal/5 px-1.5 py-0.5 rounded text-[10px] font-semibold text-teal border border-teal/10 transition-colors group-hover:bg-teal/10">
                <IconFileText className="h-3 w-3" />
                <span>{notebook.source_count}</span>
              </div>
              <div className="flex items-center gap-1 bg-gold/5 px-1.5 py-0.5 rounded text-[10px] font-semibold text-gold border border-gold/10 transition-colors group-hover:bg-gold/10">
                <IconNote className="h-3 w-3" />
                <span>{notebook.note_count}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label={t('common.actions')}
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity shrink-0 h-8 w-8 p-0 rounded-md hover:bg-accent/60 ml-2"
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

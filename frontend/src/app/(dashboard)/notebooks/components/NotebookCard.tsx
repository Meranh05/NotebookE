'use client'

import { useRouter } from 'next/navigation'
import { NotebookResponse } from '@/lib/types/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { IconArchive, IconArchiveOff, IconBook, IconDots, IconFileText, IconNote, IconTrash } from '@tabler/icons-react'
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

export function NotebookCard({ notebook }: NotebookCardProps) {
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

  const handleCardClick = () => {
    router.push(`/notebooks/${encodeURIComponent(notebook.id)}`)
  }

  return (
    <>
      <Card 
        className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-border bg-card rounded-2xl flex flex-col min-h-[170px] p-5 hover:border-foreground/20 shadow-md"
        onClick={handleCardClick}
        style={{ cursor: 'pointer' }}
      >
        <div className="flex justify-between items-start mb-5">
          {/* Large, soft colorful icon */}
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary/15 transition-all duration-300">
            <IconBook className="h-5 w-5" />
          </div>
          
          {/* Action Menu */}
          <div className="flex items-center gap-2">
            {notebook.archived && (
              <Badge variant="secondary" className="bg-background text-[10px] px-2 py-0.5 border-none shadow-sm font-medium">
                {t('notebooks.archived')}
              </Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-surface-raised text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconDots className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()} className="w-48 shadow-pop border-border rounded-xl">
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
        
        {/* Content Section */}
        <div className="flex-1 flex flex-col">
          <CardTitle className="font-display text-[16px] font-semibold tracking-tight text-foreground mb-1 group-hover:text-primary transition-colors">
            {notebook.name}
          </CardTitle>
          <CardDescription className="line-clamp-2 text-[12px] text-muted-foreground/70 mb-4 leading-relaxed min-h-[2.25rem]">
            {notebook.description || <span className="italic opacity-50">{t('chat.noDescription')}</span>}
          </CardDescription>

          <div className="mt-auto flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground/80 font-medium">
              {formatDistanceToNow(new Date(notebook.updated), { 
                addSuffix: true,
                locale: getDateLocale(language)
              })}
            </span>
            <div className="flex items-center gap-3 text-muted-foreground/80">
              <div className="flex items-center gap-1 hover:text-teal transition-colors" title="Sources">
                <IconFileText className="h-3.5 w-3.5" />
                <span className="text-[11px] font-semibold">{notebook.source_count}</span>
              </div>
              <div className="flex items-center gap-1 hover:text-gold transition-colors" title="Notes">
                <IconNote className="h-3.5 w-3.5" />
                <span className="text-[11px] font-semibold">{notebook.note_count}</span>
              </div>
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

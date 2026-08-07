'use client'

import { useState } from 'react'
import { NotebookResponse } from '@/lib/types/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { IconArchive, IconArchiveOff, IconTrash } from '@tabler/icons-react'
import { useUpdateNotebook } from '@/lib/hooks/use-notebooks'
import { NotebookDeleteDialog } from './NotebookDeleteDialog'
import { formatDistanceToNow } from 'date-fns'
import { getDateLocale } from '@/lib/utils/date-locale'
import { InlineEdit } from '@/components/common/InlineEdit'
import { useTranslation } from '@/lib/hooks/use-translation'

interface NotebookHeaderProps {
  notebook: NotebookResponse
}

export function NotebookHeader({ notebook }: NotebookHeaderProps) {
  const { t, language } = useTranslation()
  const dfLocale = getDateLocale(language)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const updateNotebook = useUpdateNotebook()

  const handleUpdateName = async (name: string) => {
    if (!name || name === notebook.name) return

    await updateNotebook.mutateAsync({
      id: notebook.id,
      data: { name }
    })
  }

  const handleUpdateDescription = async (description: string) => {
    if (description === notebook.description) return

    await updateNotebook.mutateAsync({
      id: notebook.id,
      data: { description: description || undefined }
    })
  }

  const handleArchiveToggle = () => {
    updateNotebook.mutate({
      id: notebook.id,
      data: { archived: !notebook.archived }
    })
  }

  return (
    <>
      <div className="border-b pb-4">
        <div className="flex flex-col gap-2 w-full">
          <div className="flex items-start lg:items-center justify-between flex-col lg:flex-row gap-4 lg:gap-6 w-full">
            {/* Title Section (Fixed proportion) */}
            <div className="flex items-center gap-3 w-full lg:w-[25%] min-w-0 flex-shrink-0">
              <InlineEdit
                id="notebook-name"
                name="notebook-name"
                value={notebook.name}
                onSave={handleUpdateName}
                className="font-display text-xl font-bold tracking-tight truncate text-left w-full block"
                inputClassName="font-display text-xl font-bold tracking-tight w-full min-w-[200px]"
                placeholder={t('notebooks.namePlaceholder')}
              />
              {notebook.archived && (
                <Badge variant="secondary" className="flex-shrink-0">{t('notebooks.archived')}</Badge>
              )}
            </div>

            <div className="h-[30px] w-[1px] bg-border hidden lg:block flex-shrink-0" />

            {/* Description Section (Remaining space) */}
            <div className="flex flex-col gap-1 min-w-0 flex-1 w-full">
                <InlineEdit
                  id="notebook-description"
                  name="notebook-description"
                  value={notebook.description || ''}
                  onSave={handleUpdateDescription}
                  className="text-sm text-muted-foreground truncate w-full cursor-pointer hover:text-foreground transition-colors"
                  inputClassName="text-sm text-muted-foreground w-full"
                  placeholder={t('notebooks.addDescription')}
                  emptyText={t('notebooks.addDescription')}
                />
                <div className="text-xs text-muted-foreground/70 whitespace-nowrap truncate">
                  {t('common.created', { time: formatDistanceToNow(new Date(notebook.created), { addSuffix: true, locale: dfLocale }) })} • 
                  {' '}{t('common.updated', { time: formatDistanceToNow(new Date(notebook.updated), { addSuffix: true, locale: dfLocale }) })}
                </div>
              </div>

            {/* Actions Section */}
            <div className="flex gap-2 flex-shrink-0 w-full lg:w-auto justify-start lg:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleArchiveToggle}
              >
                {notebook.archived ? (
                  <>
                    <IconArchiveOff className="h-4 w-4 mr-2" />
                    {t('notebooks.unarchive')}
                  </>
                ) : (
                  <>
                    <IconArchive className="h-4 w-4 mr-2" />
                    {t('notebooks.archive')}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive hover:text-destructive"
              >
                <IconTrash className="h-4 w-4 mr-2" />
                {t('common.delete')}
              </Button>
            </div>
          </div>

          {/* Signature: one short flat fern underline — one hue, no show */}
          <div aria-hidden className="h-[3px] w-14 rounded-[1px] bg-fern" />
        </div>
      </div>

      <NotebookDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        notebookId={notebook.id}
        notebookName={notebook.name}
        redirectAfterDelete
      />
    </>
  )
}
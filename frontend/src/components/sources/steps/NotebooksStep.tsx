"use client"

import { useTranslation } from "@/lib/hooks/use-translation"
import { CheckboxList } from "@/components/ui/checkbox-list"
import { NotebookResponse } from "@/lib/types/api"
import { IconBook2 } from '@tabler/icons-react'

interface NotebooksStepProps {
  notebooks: NotebookResponse[]
  selectedNotebooks: string[]
  onToggleNotebook: (notebookId: string) => void
  loading?: boolean
}

export function NotebooksStep({
  notebooks,
  selectedNotebooks,
  onToggleNotebook,
  loading = false
}: NotebooksStepProps) {
  const { t } = useTranslation()
  const notebookItems = notebooks.map((notebook) => ({
    id: notebook.id,
    title: notebook.name,
    description: notebook.description || undefined
  }))

  return (
    <div className="space-y-2.5">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
          <IconBook2 className="h-3.5 w-3.5 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {t('notebooks.title')}
            <span className="ml-1.5 text-muted-foreground font-normal text-xs">({t('common.optional')})</span>
          </h3>
          <p className="text-xs text-muted-foreground">{t('sources.addExistingDesc')}</p>
        </div>
      </div>

      <CheckboxList
        items={notebookItems}
        selectedIds={selectedNotebooks}
        onToggle={onToggleNotebook}
        loading={loading}
        emptyMessage={t('sources.noNotebooksFound')}
      />
    </div>
  )
}
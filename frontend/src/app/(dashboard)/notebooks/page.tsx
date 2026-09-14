'use client'

import { useMemo, useState } from 'react'

import { NotebookList } from './components/NotebookList'
import { RecentlyViewed } from './components/RecentlyViewed'
import { Button } from '@/components/ui/button'
import { IconBook2, IconCategory2, IconList, IconPlus, IconSearch } from '@tabler/icons-react'
import { useNotebooks } from '@/lib/hooks/use-notebooks'
import { CreateNotebookDialog } from '@/components/notebooks/CreateNotebookDialog'
import { Input } from '@/components/ui/input'
import { useTranslation } from '@/lib/hooks/use-translation'
import { useNotebookViewStore } from '@/lib/stores/notebook-view-store'

export default function NotebooksPage() {
  const { t } = useTranslation()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const viewMode = useNotebookViewStore((state) => state.viewMode)
  const setViewMode = useNotebookViewStore((state) => state.setViewMode)
  const { data: notebooks, isLoading } = useNotebooks(false)
  const { data: archivedNotebooks } = useNotebooks(true)

  const normalizedQuery = searchTerm.trim().toLowerCase()

  const filteredActive = useMemo(() => {
    if (!notebooks) {
      return undefined
    }
    if (!normalizedQuery) {
      return notebooks
    }
    return notebooks.filter((notebook) =>
      notebook.name.toLowerCase().includes(normalizedQuery)
    )
  }, [notebooks, normalizedQuery])

  const filteredArchived = useMemo(() => {
    if (!archivedNotebooks) {
      return undefined
    }
    if (!normalizedQuery) {
      return archivedNotebooks
    }
    return archivedNotebooks.filter((notebook) =>
      notebook.name.toLowerCase().includes(normalizedQuery)
    )
  }, [archivedNotebooks, normalizedQuery])

  const hasArchived = (archivedNotebooks?.length ?? 0) > 0
  const isSearching = normalizedQuery.length > 0

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-muted/20">
        <div className="mx-auto max-w-[1360px] space-y-7 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <header className="rounded-3xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/35 dark:text-indigo-300">
                  <IconBook2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-display text-2xl font-bold tracking-[-0.03em] text-foreground sm:text-3xl">
                      {t('notebooks.title')}
                    </h1>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      {notebooks?.length ?? 0}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{t('notebooks.activeNotebooks')}</p>
                </div>
              </div>

              <div className="flex w-full flex-col gap-2.5 rounded-xl border border-border/70 bg-muted/25 p-2 sm:flex-row xl:w-auto xl:items-center">
                <div className="relative w-full sm:min-w-[280px] lg:w-[340px]">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <IconSearch className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    id="notebook-search"
                    name="notebook-search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder={t('notebooks.searchPlaceholder')}
                    autoComplete="off"
                    aria-label={t('common.accessibility.searchNotebooks') || "IconSearch notebooks"}
                    className="h-9 w-full rounded-lg border-border bg-background pl-9 transition-colors hover:border-foreground/25 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 sm:justify-start">
                  <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-background p-1">
                    <Button
                      variant={viewMode === 'tile' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('tile')}
                      aria-label={t('notebooks.tileView')}
                      aria-pressed={viewMode === 'tile'}
                      title={t('notebooks.tileView')}
                      className={`h-7 w-7 rounded-md p-0 ${viewMode === 'tile' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                    >
                      <IconCategory2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      aria-label={t('notebooks.listView')}
                      aria-pressed={viewMode === 'list'}
                      title={t('notebooks.listView')}
                      className={`h-7 w-7 rounded-md p-0 ${viewMode === 'list' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                    >
                      <IconList className="h-4 w-4" />
                    </Button>
                  </div>

                  <Button
                    onClick={() => setCreateDialogOpen(true)}
                    className="h-9 shrink-0 rounded-lg bg-foreground px-4 font-semibold text-background transition-colors hover:bg-foreground/90"
                  >
                    <IconPlus className="mr-2 h-5 w-5" />
                    {t('notebooks.newNotebook')}
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <div className="space-y-7">
            <RecentlyViewed />

            <NotebookList
              notebooks={filteredActive}
              isLoading={isLoading}
              title={t('notebooks.activeNotebooks')}
              emptyTitle={isSearching ? t('common.noMatches') : undefined}
              emptyDescription={isSearching ? t('common.tryDifferentSearch') : undefined}
              onAction={!isSearching ? () => setCreateDialogOpen(true) : undefined}
              actionLabel={!isSearching ? t('notebooks.newNotebook') : undefined}
            />

            {hasArchived && (
              <NotebookList
                notebooks={filteredArchived}
                isLoading={false}
                title={t('notebooks.archivedNotebooks')}
                collapsible
                emptyTitle={isSearching ? t('common.noMatches') : undefined}
                emptyDescription={isSearching ? t('common.tryDifferentSearch') : undefined}
              />
            )}
          </div>
        </div>
      </div>

      <CreateNotebookDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </>
  )
}

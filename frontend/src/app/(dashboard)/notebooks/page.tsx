'use client'

import { useMemo, useState } from 'react'

import { AppShell } from '@/components/layout/AppShell'
import { NotebookList } from './components/NotebookList'
import { RecentlyViewed } from './components/RecentlyViewed'
import { Button } from '@/components/ui/button'
import { IconCategory2, IconList, IconPlus, IconRefresh, IconSearch } from '@tabler/icons-react'
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
  const { data: notebooks, isLoading, refetch } = useNotebooks(false)
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
    <AppShell>
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-8 animate-in fade-in duration-500">
          
          {/* Header Section */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">
                    {t('notebooks.title')}
                  </h1>
                  <Button variant="ghost" size="icon" onClick={() => refetch()} className="rounded-md hover:bg-surface-raised h-8 w-8 transition-colors">
                    <IconRefresh className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative w-full md:w-[320px]">
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
                    className="w-full pl-9 h-10 bg-card border border-border hover:border-foreground/20 rounded-full focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all shadow-sm text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                
                <div className="flex items-center gap-1 bg-surface-recessed p-1 rounded-full border border-border/50 shrink-0">
                  <Button
                    variant={viewMode === 'tile' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('tile')}
                    aria-label={t('notebooks.tileView')}
                    aria-pressed={viewMode === 'tile'}
                    title={t('notebooks.tileView')}
                    className={`rounded-full h-8 w-8 p-0 ${viewMode === 'tile' ? 'bg-card shadow-soft text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-transparent'}`}
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
                    className={`rounded-full h-8 w-8 p-0 ${viewMode === 'list' ? 'bg-card shadow-soft text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-transparent'}`}
                  >
                    <IconList className="h-4 w-4" />
                  </Button>
                </div>

                <Button 
                  onClick={() => setCreateDialogOpen(true)} 
                  className="rounded-full h-10 shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all bg-foreground hover:bg-foreground/90 text-background font-semibold px-6 shrink-0"
                >
                  <IconPlus className="h-5 w-5 mr-2" />
                  {t('notebooks.newNotebook')}
                </Button>
              </div>
            </div>
          </div>
        
        <div className="space-y-8">
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
    </AppShell>
  )
}

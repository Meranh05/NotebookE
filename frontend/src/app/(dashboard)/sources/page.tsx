'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { sourcesApi, type SourceSortField } from '@/lib/api/sources'
import { SourceListResponse } from '@/lib/types/api'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { AppShell } from '@/components/layout/AppShell'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { IconAlignLeft, IconArrowDown, IconArrowUp, IconArrowsVertical, IconFileSpreadsheet, IconFileText, IconFileZip, IconLink, IconMusic, IconPhoto, IconPlus, IconPresentation, IconTrash, IconUpload, IconVideo } from '@tabler/icons-react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/hooks/use-translation'
import { getDateLocale } from '@/lib/utils/date-locale'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { getApiErrorKey } from '@/lib/utils/error-handler'
import { AddSourceDialog } from '@/components/sources/AddSourceDialog'

export default function SourcesPage() {
  const { t, language } = useTranslation()
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false)
  const failedToLoadMessage = t('sources.failedToLoad')
  const [sources, setSources] = useState<SourceListResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [sortBy, setSortBy] = useState<SourceSortField>('updated')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; source: SourceListResponse | null }>({
    open: false,
    source: null
  })
  const router = useRouter()
  const tableRef = useRef<HTMLTableElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)
  const loadingMoreRef = useRef(false)
  const hasMoreRef = useRef(true)
  const PAGE_SIZE = 30

  const fetchSources = useCallback(async (reset = false) => {
    try {
      // Check flags before proceeding
      if (!reset && (loadingMoreRef.current || !hasMoreRef.current)) {
        return
      }

      if (reset) {
        setLoading(true)
        offsetRef.current = 0
        setSources([])
        hasMoreRef.current = true
      } else {
        loadingMoreRef.current = true
        setLoadingMore(true)
      }

      const data = await sourcesApi.list({
        limit: PAGE_SIZE,
        offset: offsetRef.current,
        sort_by: sortBy,
        sort_order: sortOrder,
      })

      if (reset) {
        setSources(data)
      } else {
        setSources(prev => [...prev, ...data])
      }

      // Check if we have more data
      const hasMoreData = data.length === PAGE_SIZE
      hasMoreRef.current = hasMoreData
      offsetRef.current += data.length
    } catch (err) {
      console.error('Failed to fetch sources:', err)
      setError(failedToLoadMessage)
      toast.error(failedToLoadMessage)
    } finally {
      setLoading(false)
      setLoadingMore(false)
      loadingMoreRef.current = false
    }
  }, [sortBy, sortOrder, failedToLoadMessage])

  // Initial load and when sort changes
  useEffect(() => {
    fetchSources(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortOrder])

  useEffect(() => {
    // Focus the table when component mounts or sources change
    if (sources.length > 0 && tableRef.current) {
      tableRef.current.focus()
    }
  }, [sources])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (sources.length === 0) return

      switch (e.key) {
        case 'IconArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => {
            const newIndex = Math.min(prev + 1, sources.length - 1)
            // Scroll to keep selected row visible
            setTimeout(() => scrollToSelectedRow(newIndex), 0)
            return newIndex
          })
          break
        case 'IconArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => {
            const newIndex = Math.max(prev - 1, 0)
            // Scroll to keep selected row visible
            setTimeout(() => scrollToSelectedRow(newIndex), 0)
            return newIndex
          })
          break
        case 'Enter':
          e.preventDefault()
          if (sources[selectedIndex]) {
            router.push(`/sources/${sources[selectedIndex].id}`)
          }
          break
        case 'Home':
          e.preventDefault()
          setSelectedIndex(0)
          setTimeout(() => scrollToSelectedRow(0), 0)
          break
        case 'End':
          e.preventDefault()
          const lastIndex = sources.length - 1
          setSelectedIndex(lastIndex)
          setTimeout(() => scrollToSelectedRow(lastIndex), 0)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sources, selectedIndex, router])

  const scrollToSelectedRow = (index: number) => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    // Find the selected row element
    const rows = scrollContainer.querySelectorAll('tbody tr')
    const selectedRow = rows[index] as HTMLElement
    if (!selectedRow) return

    const containerRect = scrollContainer.getBoundingClientRect()
    const rowRect = selectedRow.getBoundingClientRect()

    // Check if row is above visible area
    if (rowRect.top < containerRect.top) {
      selectedRow.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    // Check if row is below visible area
    else if (rowRect.bottom > containerRect.bottom) {
      selectedRow.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }

  // Set up scroll listener after sources are loaded
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    let scrollTimeout: NodeJS.Timeout | null = null

    const handleScroll = () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }

      scrollTimeout = setTimeout(() => {
        if (!scrollContainerRef.current) return

        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight

        // Load more when within 200px of the bottom
        if (distanceFromBottom < 200 && !loadingMoreRef.current && hasMoreRef.current) {
          fetchSources(false)
        }
      }, 100)
    }

    scrollContainer.addEventListener('scroll', handleScroll)
    handleScroll() // Check on mount

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll)
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
    }
  }, [fetchSources, sources.length])

  const toggleSort = (field: SourceSortField) => {
    setSelectedIndex(0)
    if (sortBy === field) {
      // Toggle order if clicking the same field
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      // Switch to new field with default desc order
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const renderSortableHeader = (
    field: SourceSortField,
    label: string,
    align: 'left' | 'center' = 'left'
  ) => {
    const active = sortBy === field
    const SortIcon = active ? (sortOrder === 'asc' ? IconArrowUp : IconArrowDown) : IconArrowsVertical

    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => toggleSort(field)}
        className={cn(
          "h-8 px-2 hover:bg-muted",
          align === 'center' && "mx-auto"
        )}
      >
        {label}
        <SortIcon className={cn(
          "ml-2 h-3 w-3",
          active ? 'opacity-100' : 'opacity-30'
        )} />
      </Button>
    )
  }

  // Content-type pebble — type hues live in dots, never washes
  const getSourceTypeDotClass = (source: SourceListResponse) => {
    if (source.asset?.url) return 'bg-type-web'
    if (source.asset?.file_path) return 'bg-type-pdf'
    return 'bg-type-note'
  }

  const getSourceIcon = (source: SourceListResponse) => {
    if (source.asset?.url) {
      return (
        <div className="flex-shrink-0 flex flex-col items-center justify-center w-9 h-9 rounded-lg mr-3 bg-muted">
          <IconLink className="h-4 w-4 text-muted-foreground" />
          <span className="text-[7px] font-bold leading-none text-muted-foreground mt-0.5">LINK</span>
        </div>
      )
    }
    
    if (source.asset?.file_path) {
      const ext = (source.title || '').split('.').pop()?.toLowerCase() ?? ''
      
      let Icon = IconFileText
      let colorClass = 'text-slate-600 dark:text-slate-400'
      let bgClass = 'bg-slate-100 dark:bg-slate-800'
      
      if (['pdf'].includes(ext)) {
        Icon = IconFileText; colorClass = 'text-red-600 dark:text-red-400'; bgClass = 'bg-red-100 dark:bg-red-900/30'
      } else if (['doc', 'docx'].includes(ext)) {
        Icon = IconFileText; colorClass = 'text-blue-600 dark:text-blue-400'; bgClass = 'bg-blue-100 dark:bg-blue-900/30'
      } else if (['xls', 'xlsx'].includes(ext)) {
        Icon = IconFileSpreadsheet; colorClass = 'text-emerald-600 dark:text-emerald-400'; bgClass = 'bg-emerald-100 dark:bg-emerald-900/30'
      } else if (['ppt', 'pptx'].includes(ext)) {
        Icon = IconPresentation; colorClass = 'text-orange-600 dark:text-orange-400'; bgClass = 'bg-orange-100 dark:bg-orange-900/30'
      } else if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext)) {
        Icon = IconPhoto; colorClass = 'text-amber-600 dark:text-amber-400'; bgClass = 'bg-amber-100 dark:bg-amber-900/30'
      } else if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) {
        Icon = IconVideo; colorClass = 'text-purple-600 dark:text-purple-400'; bgClass = 'bg-purple-100 dark:bg-purple-900/30'
      } else if (['mp3', 'wav', 'm4a'].includes(ext)) {
        Icon = IconMusic; colorClass = 'text-pink-600 dark:text-pink-400'; bgClass = 'bg-pink-100 dark:bg-pink-900/30'
      } else if (['zip', 'rar', 'tar', 'gz'].includes(ext)) {
        Icon = IconFileZip; colorClass = 'text-gray-600 dark:text-gray-400'; bgClass = 'bg-gray-100 dark:bg-gray-800'
      }
      
      return (
        <div className={cn("flex-shrink-0 flex flex-col items-center justify-center w-9 h-9 rounded-lg mr-3 gap-0.5", bgClass)}>
          <Icon className={cn("h-4 w-4", colorClass)} />
          <span className={cn("text-[7.5px] font-bold leading-none", colorClass)}>
            {(ext || 'FILE').toUpperCase().slice(0, 4)}
          </span>
        </div>
      )
    }
    
    return (
      <div className="flex-shrink-0 flex flex-col items-center justify-center w-9 h-9 rounded-lg mr-3 bg-muted">
        <IconAlignLeft className="h-4 w-4 text-muted-foreground" />
        <span className="text-[7px] font-bold leading-none text-muted-foreground mt-0.5">TEXT</span>
      </div>
    )
  }

  const getSourceType = (source: SourceListResponse) => {
    if (source.asset?.url) return t('sources.type.link')
    if (source.asset?.file_path) return t('sources.type.file')
    return t('sources.type.text')
  }

  const handleRowClick = useCallback((index: number, sourceId: string) => {
    setSelectedIndex(index)
    router.push(`/sources/${sourceId}`)
  }, [router])

  const handleDeleteClick = useCallback((e: React.MouseEvent, source: SourceListResponse) => {
    e.stopPropagation() // Prevent row click
    setDeleteDialog({ open: true, source })
  }, [])

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.source) return

    try {
      await sourcesApi.delete(deleteDialog.source.id)
      toast.success(t('sources.deleteSuccess'))
      // Remove the deleted source from the list
      setSources(prev => prev.filter(s => s.id !== deleteDialog.source?.id))
      setDeleteDialog({ open: false, source: null })
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } }, message?: string };
      console.error('Failed to delete source:', error)
      toast.error(t(getApiErrorKey(error.response?.data?.detail || error.message)))
    }
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex h-full items-center justify-center">
          <LoadingSpinner />
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex h-full items-center justify-center">
          <p className="text-destructive">{error}</p>
        </div>
      )
    }

    if (sources.length === 0) {
      return (
        <EmptyState
          icon={IconFileText}
          title={t('sources.noSourcesYet')}
          description={t('sources.allSourcesDescShort')}
          action={
            <Button onClick={() => setSourceDialogOpen(true)} variant="outline" className="mt-4">
              <IconPlus className="h-4 w-4 mr-2" />
              {t('sources.newSource')}
            </Button>
          }
        />
      )
    }

    return (<>
      <div className="flex flex-col h-full w-full max-w-none px-6 py-6">
        <div className="mb-6 flex-shrink-0">
          <h1 className="font-display text-2xl font-bold tracking-tight">{t('sources.allSources')}</h1>
          <p className="mt-2 text-muted-foreground">
            {t('sources.allSourcesDesc')}
          </p>
        </div>

        <div ref={scrollContainerRef} className="flex-1 rounded-md border overflow-auto">
          <table
            ref={tableRef}
            tabIndex={0}
            className="w-full min-w-[1100px] outline-none table-fixed"
          >
            <colgroup>
              <col className="w-[110px]" />
              <col className="w-auto" />
              <col className="w-[140px]" />
              <col className="w-[140px]" />
              <col className="w-[160px]" />
              <col className="w-[180px]" />
              <col className="w-[100px]" />
            </colgroup>
            <thead className="sticky top-0 bg-background z-10">
              <tr className="border-b">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  {renderSortableHeader('type', t('common.type'))}
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                  {renderSortableHeader('title', t('common.title'))}
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hidden sm:table-cell">
                  {renderSortableHeader('created', t('common.created_label'))}
                </th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hidden sm:table-cell">
                  {renderSortableHeader('updated', t('common.updated_label'))}
                </th>
                <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground hidden md:table-cell">
                  {renderSortableHeader('insights_count', t('sources.insights'), 'center')}
                </th>
                <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground hidden lg:table-cell">
                  {renderSortableHeader('embedded', t('sources.embedded'), 'center')}
                </th>
                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source, index) => (
                <tr
                  key={source.id}
                  onClick={() => handleRowClick(index, source.id)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "border-b transition-colors cursor-pointer",
                    selectedIndex === index
                      ? "bg-accent"
                      : "hover:bg-[var(--surface-raised)]"
                  )}
                >
                  <td className="h-12 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className={cn('h-2 w-2 shrink-0 rounded-full', getSourceTypeDotClass(source))}
                      />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {getSourceType(source)}
                      </span>
                    </div>
                  </td>
                  <td className="h-12 px-4 max-w-0">
                    <div className="flex items-center">
                      {getSourceIcon(source)}
                      <div className="flex flex-col overflow-hidden w-full">
                        <span 
                          className="font-medium truncate" 
                          title={source.title || t('sources.untitledSource')}
                        >
                          {source.title || t('sources.untitledSource')}
                        </span>
                        {source.asset?.url && (
                          <span 
                            className="text-xs text-muted-foreground truncate" 
                            title={source.asset.url}
                          >
                            {source.asset.url}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="h-12 px-4 text-muted-foreground text-sm hidden sm:table-cell">
                    {formatDistanceToNow(new Date(source.created), { 
                      addSuffix: true,
                      locale: getDateLocale(language)
                    })}
                  </td>
                  <td className="h-12 px-4 text-muted-foreground text-sm hidden sm:table-cell">
                    {formatDistanceToNow(new Date(source.updated), {
                      addSuffix: true,
                      locale: getDateLocale(language)
                    })}
                  </td>
                  <td className="h-12 px-4 text-center hidden md:table-cell">
                    <span className="text-sm font-medium">{source.insights_count || 0}</span>
                  </td>
                  <td className="h-12 px-4 text-center hidden lg:table-cell">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium",
                        source.embedded
                          ? "bg-fern-tint text-fern-deep dark:text-fern"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {source.embedded ? t('sources.yes') : t('sources.no')}
                    </span>
                  </td>
                  <td className="h-12 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDeleteClick(e, source)}
                      className="text-destructive hover:text-destructive"
                    >
                      <IconTrash className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {loadingMore && (
                <tr>
                  <td colSpan={7} className="h-16 text-center">
                    <div className="flex items-center justify-center">
                      <LoadingSpinner />
                      <span className="ml-2 text-muted-foreground">{t('sources.loadingMore')}</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, source: deleteDialog.source })}
        title={t('sources.delete')}
        description={t('sources.deleteConfirmWithTitle', { title: deleteDialog.source?.title || t('sources.untitledSource') })}
        confirmText={t('common.delete')}
        confirmVariant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </>)
  }

  return (
    <AppShell>
      {renderContent()}
      <AddSourceDialog
        open={sourceDialogOpen}
        onOpenChange={(open) => {
          setSourceDialogOpen(open)
          if (!open) fetchSources(true)
        }}
      />
    </AppShell>
  )
}

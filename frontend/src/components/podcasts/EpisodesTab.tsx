'use client'

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  IconAlertCircle,
  IconCircleCheck,
  IconClock,
  IconLoader2,
  IconLayoutGrid,
  IconList,
  IconMicrophone,
  IconPlus,
  IconRefresh,
  IconSearch,
} from '@tabler/icons-react'

import { useDeletePodcastEpisode, usePodcastEpisodes, useRetryPodcastEpisode, useCancelPodcastEpisode } from '@/lib/hooks/use-podcasts'
import { EpisodeCard } from '@/components/podcasts/EpisodeCard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GeneratePodcastDialog } from '@/components/podcasts/GeneratePodcastDialog'
import { useTranslation } from '@/lib/hooks/use-translation'
import type { TFunction } from 'i18next'

const getSTATUS_ORDER = (t: TFunction): Array<{
  key: 'running' | 'completed' | 'failed' | 'pending'
  title: string
  description?: string
}> => [
  {
    key: 'running',
    title: t('podcasts.statusRunningTitle'),
    description: t('podcasts.statusRunningDesc'),
  },
  {
    key: 'pending',
    title: t('podcasts.statusPendingTitle'),
    description: t('podcasts.statusPendingDesc'),
  },
  {
    key: 'completed',
    title: t('podcasts.statusCompletedTitle'),
    description: t('podcasts.statusCompletedDesc'),
  },
  {
    key: 'failed',
    title: t('podcasts.statusFailedTitle'),
    description: t('podcasts.statusFailedDesc'),
  },
]

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon: ReactNode
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 px-1 py-1">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-violet-100 bg-violet-50 text-violet-600 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-300">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold leading-none tabular-nums">{value}</p>
        <p className="mt-1 truncate text-[11px] font-medium text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

export function EpisodesTab() {
  const { t } = useTranslation()
  const [showGenerateDialog, setShowGenerateDialog] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'pending' | 'completed' | 'failed'>('all')
  const {
    episodes,
    statusGroups,
    statusCounts,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = usePodcastEpisodes()
  const deleteEpisode = useDeletePodcastEpisode()
  const retryEpisode = useRetryPodcastEpisode()
  const cancelEpisode = useCancelPodcastEpisode()

  const handleRefresh = useCallback(() => {
    void refetch()
  }, [refetch])

  const handleDelete = useCallback(
    (episodeId: string) => deleteEpisode.mutateAsync(episodeId),
    [deleteEpisode]
  )

  const handleRetry = useCallback(
    async (episodeId: string) => { await retryEpisode.mutateAsync(episodeId) },
    [retryEpisode]
  )

  const handleCancel = useCallback(
    async (episodeId: string) => { await cancelEpisode.mutateAsync(episodeId) },
    [cancelEpisode]
  )

  const emptyState = !isLoading && episodes.length === 0
  const filteredGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return getSTATUS_ORDER(t).map(({ key, title, description }) => ({
      key,
      title,
      description,
      episodes: (statusGroups[key] ?? []).filter(episode =>
        (!normalizedQuery || `${episode.name} ${episode.episode_profile?.name ?? ''}`.toLowerCase().includes(normalizedQuery))
      ),
    })).filter(group => statusFilter === 'all' || group.key === statusFilter)
  }, [query, statusFilter, statusGroups, t])

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-lg border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
            <IconMicrophone className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 className="font-display text-xl font-semibold tracking-tight">{t('podcasts.overviewTitle')}</h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {t('podcasts.overviewDesc')}
            </p>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Button className="flex-1 gap-2 sm:flex-none" onClick={() => setShowGenerateDialog(true)}>
            <IconPlus className="h-4 w-4" />
            {t('podcasts.generateBtn')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
          >
            {isFetching ? (
              <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <IconRefresh className="mr-2 h-4 w-4" />
            )}
            {t('common.refresh')}
          </Button>
          <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
            <Button type="button" variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('list')} title="Dạng danh sách" aria-label="Dạng danh sách">
              <IconList className="h-4 w-4" />
            </Button>
            <Button type="button" variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('grid')} title="Dạng lưới" aria-label="Dạng lưới">
              <IconLayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-3">
        <SummaryCard label={t('podcasts.total')} value={statusCounts.total} icon={<IconMicrophone className="h-4 w-4" />} />
        <SummaryCard label={t('podcasts.processingLabel')} value={statusCounts.running} icon={<IconLoader2 className="h-4 w-4" />} />
        <SummaryCard label={t('podcasts.completedLabel')} value={statusCounts.completed} icon={<IconCircleCheck className="h-4 w-4" />} />
        <SummaryCard label={t('podcasts.failedLabel')} value={statusCounts.failed} icon={<IconAlertCircle className="h-4 w-4" />} />
        <SummaryCard label={t('podcasts.pendingLabel')} value={statusCounts.pending} icon={<IconClock className="h-4 w-4" />} />
        </div>
        <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm theo tên tập hoặc hồ sơ..." className="h-9 bg-background pl-9 text-sm" />
          </div>
          <div className="flex gap-1 overflow-x-auto rounded-lg bg-muted/50 p-1">
            {([['all', 'Tất cả'], ['running', 'Đang xử lý'], ['pending', 'Đang chờ'], ['completed', 'Hoàn thành'], ['failed', 'Thất bại']] as const).map(([value, label]) => (
              <Button key={value} type="button" variant={statusFilter === value ? 'secondary' : 'ghost'} size="sm" className="h-7 shrink-0 px-2.5 text-xs" onClick={() => setStatusFilter(value)}>{label}</Button>
            ))}
          </div>
        </div>
      </div>

      {isError ? (
        <Alert variant="destructive">
          <IconAlertCircle className="h-4 w-4" />
          <AlertTitle>{t('podcasts.loadErrorTitle')}</AlertTitle>
          <AlertDescription>
            {t('podcasts.loadErrorDesc')}
          </AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <div className="space-y-3 rounded-lg border bg-card p-4">
          {[1, 2, 3].map(item => <div key={item} className="h-16 animate-pulse rounded-md bg-muted/60" />)}
        </div>
      ) : null}

      {emptyState ? (
        <div className="rounded-md border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {t('podcasts.noEpisodesYet')}
          </p>
        </div>
      ) : null}

      {!isLoading && episodes.length > 0 && filteredGroups.every(group => group.episodes.length === 0) ? (
        <div className="rounded-lg border border-dashed bg-card p-10 text-center">
          <IconSearch className="mx-auto h-6 w-6 text-muted-foreground/60" />
          <p className="mt-2 text-sm text-muted-foreground">Không tìm thấy tập podcast phù hợp.</p>
        </div>
      ) : null}

      {filteredGroups.map(({ key, title, description, episodes: data }) => {
        if (!data || data.length === 0) {
          return null
        }

        return (
          <section key={key} className="space-y-3">
            <div className="flex items-end justify-between gap-4 border-b pb-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-lg font-semibold leading-tight">{title}</h3>
                  <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
                    {data.length}
                  </span>
                </div>
                {description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                ) : null}
              </div>
            </div>
            <div className={viewMode === 'list' ? 'space-y-2' : 'grid gap-4 xl:grid-cols-2'}>
              {data.map((episode) => (
                <EpisodeCard
                  key={episode.id}
                  episode={episode}
                  onDelete={handleDelete}
                  deleting={deleteEpisode.isPending}
                  onRetry={handleRetry}
                  retrying={retryEpisode.isPending}
                  onCancel={handleCancel}
                  cancelling={cancelEpisode.isPending}
                />
              ))}
            </div>
          </section>
        )
      })}

      <GeneratePodcastDialog
        open={showGenerateDialog}
        onOpenChange={setShowGenerateDialog}
      />
    </div>
  )
}

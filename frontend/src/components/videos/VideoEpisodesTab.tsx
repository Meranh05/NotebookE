'use client'

import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { IconAlertCircle, IconCircleCheck, IconClock, IconLayoutGrid, IconList, IconLoader2, IconRefresh, IconSearch, IconVideo } from '@tabler/icons-react'

import { useDeleteVideo, useVideos } from '@/lib/hooks/use-videos'
import { VideoEpisodeCard } from '@/components/videos/VideoEpisodeCard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function SummaryCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 px-1 py-1">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-sky-100 bg-sky-50 text-sky-600 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300">{icon}</div>
      <div><p className="text-lg font-bold leading-none tabular-nums">{value}</p><p className="mt-1 text-[11px] font-medium text-muted-foreground">{label}</p></div>
    </div>
  )
}

export function VideoEpisodesTab() {
  const {
    data: episodes = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useVideos()
  
  const deleteEpisode = useDeleteVideo()
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'pending' | 'completed' | 'failed'>('all')

  const handleRefresh = useCallback(() => {
    void refetch()
  }, [refetch])

  const handleDelete = useCallback(
    (episodeId: string) => deleteEpisode.mutateAsync(episodeId),
    [deleteEpisode]
  )

  const emptyState = !isLoading && episodes.length === 0

  const statusCounts = episodes.reduce(
    (acc, ep) => {
      acc.total++
      const status = ep.job_status || 'unknown'
      if (status === 'running' || status === 'processing') acc.running++
      else if (status === 'completed' || status === 'success') acc.completed++
      else if (status === 'failed' || status === 'error') acc.failed++
      else if (status === 'pending' || status === 'submitted') acc.pending++
      return acc
    },
    { total: 0, running: 0, completed: 0, failed: 0, pending: 0 }
  )

  const filteredGroups = useMemo(() => {
    const groups = [
      { key: 'running', title: 'Đang xử lý', episodes: episodes.filter(ep => ['running', 'processing'].includes(ep.job_status || '')) },
      { key: 'pending', title: 'Đang chờ', episodes: episodes.filter(ep => ['pending', 'submitted'].includes(ep.job_status || '')) },
      { key: 'completed', title: 'Hoàn thành', episodes: episodes.filter(ep => ['completed', 'success'].includes(ep.job_status || '')) },
      { key: 'failed', title: 'Thất bại', episodes: episodes.filter(ep => ['failed', 'error'].includes(ep.job_status || '')) },
    ]
    const normalizedQuery = query.trim().toLowerCase()
    return groups.map(group => ({
      ...group,
      episodes: group.episodes.filter(episode => !normalizedQuery || episode.name.toLowerCase().includes(normalizedQuery)),
    })).filter(group => statusFilter === 'all' || group.key === statusFilter)
  }, [episodes, query, statusFilter])

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-muted text-muted-foreground"><IconVideo className="h-4 w-4" /></div>
            <div><h2 className="text-base font-semibold">Thư viện video</h2><p className="text-xs text-muted-foreground">Theo dõi tiến trình và xem các sản phẩm đã hoàn tất.</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching} className="gap-2">
              {isFetching ? <IconLoader2 className="h-4 w-4 animate-spin" /> : <IconRefresh className="h-4 w-4" />}
              Làm mới
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
          <SummaryCard label="Tổng số" value={statusCounts.total} icon={<IconVideo className="h-4 w-4" />} />
          <SummaryCard label="Đang xử lý" value={statusCounts.running} icon={<IconLoader2 className="h-4 w-4" />} />
          <SummaryCard label="Hoàn thành" value={statusCounts.completed} icon={<IconCircleCheck className="h-4 w-4" />} />
          <SummaryCard label="Thất bại" value={statusCounts.failed} icon={<IconAlertCircle className="h-4 w-4" />} />
          <SummaryCard label="Đang chờ" value={statusCounts.pending} icon={<IconClock className="h-4 w-4" />} />
        </div>
        <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm theo tên video..." className="h-9 bg-background pl-9 text-sm" />
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
          <AlertTitle>Không thể tải danh sách video</AlertTitle>
          <AlertDescription>
            Không thể lấy danh sách video đã tạo. Vui lòng thử lại.
          </AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <div className="space-y-3 rounded-lg border bg-card p-4">
          {[1, 2, 3].map(item => <div key={item} className="h-24 animate-pulse rounded-md bg-muted/60" />)}
        </div>
      ) : null}

      {emptyState ? (
        <div className="rounded-lg border border-dashed bg-card p-12 text-center">
          <IconVideo className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="mt-3 text-sm text-muted-foreground">
            Bạn chưa tạo video nào. Hãy mở một sổ tay để bắt đầu.
          </p>
        </div>
      ) : null}

      {!isLoading && episodes.length > 0 && filteredGroups.every(group => group.episodes.length === 0) ? (
        <div className="rounded-lg border border-dashed bg-card p-10 text-center">
          <IconSearch className="mx-auto h-6 w-6 text-muted-foreground/60" />
          <p className="mt-2 text-sm text-muted-foreground">Không tìm thấy video phù hợp.</p>
        </div>
      ) : null}

      {filteredGroups.map(({ key, title, episodes: groupEpisodes }) => {
        if (groupEpisodes.length === 0) {
          return null
        }

        return (
          <section key={key} className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-3">
              <h3 className="text-lg font-semibold leading-tight">{title}</h3>
              <Badge variant="secondary" className="rounded-full">{groupEpisodes.length}</Badge>
            </div>
            <div className={viewMode === 'list' ? 'space-y-2' : 'grid gap-4 xl:grid-cols-2'}>
              {groupEpisodes.map((episode) => (
                <VideoEpisodeCard
                  key={episode.id}
                  episode={episode}
                  onDelete={handleDelete}
                  deleting={deleteEpisode.isPending}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

'use client'

import { formatDistanceToNow } from 'date-fns'
import { getDateLocale } from '@/lib/utils/date-locale'
import { IconInfoCircle, IconTrash, IconVideo, IconMicrophone, IconLoader2 } from '@tabler/icons-react'
import { toast } from 'sonner'

import type { VideoEpisode } from '@/lib/api/videos'
import { resolveVideoAssetUrl } from '@/lib/api/videos'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useEffect, useState } from 'react'
import { useTranslation } from '@/lib/hooks/use-translation'

interface VideoEpisodeCardProps {
  episode: VideoEpisode
  onDelete: (episodeId: string) => Promise<void> | void
  deleting?: boolean
}

const FAILED_STATUSES = ['failed', 'error', 'cancelled']
const COMPLETED_STATUSES = ['completed', 'success']
const RUNNING_STATUSES = ['running', 'processing', 'pending', 'submitted']

export function VideoEpisodeCard({
  episode,
  onDelete,
  deleting,
}: VideoEpisodeCardProps) {
  const [videoUrl, setVideoUrl] = useState<string | undefined>()
  const [converting, setConverting] = useState(false)
  const { language } = useTranslation()

  useEffect(() => {
    if (episode.video_url) {
      resolveVideoAssetUrl(episode.video_url).then(setVideoUrl)
    }
  }, [episode.video_url])

  const handleConvertToPodcast = async () => {
    if (!episode.id) return
    try {
      setConverting(true)
      const res = await fetch(`/api/videos/episodes/${episode.id}/to-podcast`, {
        method: 'POST'
      })
      if (!res.ok) {
        throw new Error('Lỗi khi chuyển đổi')
      }
      toast.success('Đã lưu âm thanh thành Podcast thành công!')
    } catch (error) {
      console.error(error)
      toast.error('Có lỗi xảy ra khi chuyển thành Podcast')
    } finally {
      setConverting(false)
    }
  }

  const status = episode.job_status || 'unknown'
  const isFailed = FAILED_STATUSES.includes(status)
  const isCompleted = COMPLETED_STATUSES.includes(status)
  const isRunning = RUNNING_STATUSES.includes(status)

  const statusLabel = isCompleted
    ? 'Hoàn thành'
    : isFailed
      ? 'Thất bại'
      : isRunning
        ? 'Đang xử lý'
        : 'Đang chờ'

  const createdDate = episode.created ? new Date(episode.created) : new Date()

  return (
    <Card className={cn("group overflow-hidden border-border bg-card transition-colors duration-150 hover:border-foreground/25", isFailed ? "border-l-2 border-l-destructive" : "border-l-2 border-l-foreground/30")}>
      <CardContent className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_240px] sm:items-center sm:p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Left Info Area */}
        <div className="flex-1 space-y-3 w-full">
          <div className="space-y-1.5">
            <div className="flex items-start justify-between gap-4">
              <h4 className="font-semibold text-base line-clamp-1 group-hover:text-primary transition-colors">
                {episode.name}
              </h4>
              <Badge
                variant={isFailed ? 'destructive' : isRunning ? 'default' : 'secondary'}
                className="shrink-0 px-2.5"
              >
                {statusLabel}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center whitespace-nowrap text-[11px] font-medium bg-muted/50 px-2 py-0.5 rounded-sm">
                {formatDistanceToNow(createdDate, {
                  addSuffix: true,
                  locale: getDateLocale(language),
                })}
              </span>
              {episode.command_id && (
                <span className="font-mono text-[10px] opacity-70">
                  ID: {episode.command_id.split(':').pop()}
                </span>
              )}
            </div>
          </div>

          {isFailed && episode.error_message && (
            <div className="flex gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-2.5">
              <IconInfoCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive-foreground break-words flex-1 leading-relaxed">
                {episode.error_message}
              </p>
            </div>
          )}
          
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {isCompleted && videoUrl && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium"
                onClick={handleConvertToPodcast}
                disabled={converting}
              >
                {converting ? (
                  <IconLoader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <IconMicrophone className="h-3.5 w-3.5 mr-1.5" />
                )}
                Lưu thành Podcast
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive font-medium"
                  disabled={deleting}
                >
                  <IconTrash className="h-3.5 w-3.5 mr-1.5" />
                  Xóa
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xác nhận xóa?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bạn có chắc chắn muốn xóa video này? Hành động này không thể hoàn tác.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(episode.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Xóa
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Right Video Area */}
        <div className="order-first w-full shrink-0 sm:order-last">
          {isCompleted && videoUrl ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
              <video 
                src={videoUrl} 
                controls 
                className="h-full w-full object-contain"
                preload="none"
              />
            </div>
          ) : isRunning ? (
            <div className="flex aspect-video w-full flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 opacity-70">
              <div className="mb-2 rounded-md border bg-background p-2">
                <IconVideo className="h-5 w-5 text-muted-foreground" />
              </div>
              <h5 className="font-medium text-[11px] uppercase tracking-wider text-muted-foreground">Đang tạo...</h5>
            </div>
          ) : (
            <div className="flex aspect-video w-full flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 opacity-50">
               <IconVideo className="h-6 w-6 text-muted-foreground mb-2 opacity-50" />
               <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Lỗi</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

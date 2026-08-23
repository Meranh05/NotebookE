'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { getDateLocale } from '@/lib/utils/date-locale'
import { IconInfoCircle, IconRefresh, IconTrash, IconLoader2, IconCopy } from '@tabler/icons-react'

import apiClient from '@/lib/api/client'
import { resolvePodcastAssetUrl } from '@/lib/api/podcasts'
import { EpisodeStatus, FAILED_EPISODE_STATUSES, PodcastEpisode } from '@/lib/types/podcasts'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTranslation } from '@/lib/hooks/use-translation'
import type { TFunction } from 'i18next'

interface EpisodeCardProps {
  episode: PodcastEpisode
  onDelete: (episodeId: string) => Promise<void> | void
  deleting?: boolean
  onRetry?: (episodeId: string) => Promise<void> | void
  retrying?: boolean
  onCancel?: (episodeId: string) => Promise<void> | void
  cancelling?: boolean
}

function ActiveJobProgressViewer({ commandId }: { commandId: string }) {
  const { t } = useTranslation()
  const [progress, setProgress] = useState<Record<string, unknown> | null>(null)
  
  useEffect(() => {
    let mounted = true
    
    const fetchProgress = async () => {
      if (!commandId) return
      try {
        const res = await apiClient.get(`/commands/jobs/${commandId}`)
        if (mounted && res.data) {
          setProgress(res.data.progress || { status: res.data.status, message: res.data.error_message || 'Running...' })
        }
      } catch (err) {
        console.error('Failed to fetch job progress', err)
      }
    }
    
    fetchProgress()
    const intervalId = setInterval(fetchProgress, 3000)
    
    return () => {
      mounted = false
      clearInterval(intervalId)
    }
  }, [commandId])

  if (!progress) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        <IconLoader2 className="mx-auto h-6 w-6 animate-spin opacity-50 mb-3" />
        {t('common.loading')}
      </div>
    )
  }

  // Display progress gracefully instead of raw JSON
  return (
    <div className="space-y-4 p-5 rounded-lg border bg-gradient-to-br from-muted/30 to-muted/10 shadow-inner">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal/10">
          <IconLoader2 className="h-5 w-5 animate-spin text-teal" />
        </div>
        <div>
          <h4 className="font-semibold text-sm">Tiến trình AI</h4>
          <p className="text-xs text-muted-foreground">
            Hệ thống đang xử lý và tạo podcast. Vui lòng đợi trong giây lát...
          </p>
        </div>
      </div>
      
      <div className="mt-4 grid gap-0 rounded-md bg-background/80 border text-sm overflow-hidden">
        {Object.entries(progress).map(([key, value]) => {
          if (value === null || typeof value === 'object' || value === '') return null;
          
          return (
            <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2 px-3 border-b last:border-0 border-border/50 hover:bg-muted/30 transition-colors">
              <span className="text-muted-foreground font-medium uppercase text-xs tracking-wider">
                {key.replace(/_/g, ' ')}
              </span>
              <span className="text-foreground text-right sm:text-left text-sm break-words">
                {String(value)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const getSTATUS_META = (t: TFunction): Record<
  EpisodeStatus | 'unknown',
  { label: string; className: string }
> => ({
  running: {
    label: t('podcasts.processingLabel'),
    className: 'bg-warn-tint text-warn border-warn/30',
  },
  processing: {
    label: t('podcasts.processingLabel'),
    className: 'bg-warn-tint text-warn border-warn/30',
  },
  completed: {
    label: t('podcasts.completedLabel'),
    className: 'bg-fern-tint text-fern border-fern/30',
  },
  failed: {
    label: t('podcasts.failedLabel'),
    className: 'bg-destructive-tint text-destructive border-destructive/30',
  },
  error: {
    label: t('podcasts.failedLabel'),
    className: 'bg-destructive-tint text-destructive border-destructive/30',
  },
  cancelled: {
    label: t('podcasts.failedLabel'),
    className: 'bg-muted text-muted-foreground border-transparent',
  },
  pending: {
    label: t('podcasts.pendingLabel'),
    className: 'bg-teal-tint text-teal border-teal/30',
  },
  submitted: {
    label: t('podcasts.pendingLabel'),
    className: 'bg-teal-tint text-teal border-teal/30',
  },
  unknown: {
    label: t('common.unknown'),
    className: 'bg-muted text-muted-foreground border-transparent',
  },
})

function StatusBadge({ status }: { status?: EpisodeStatus | null }) {
  const { t } = useTranslation()
  // Don't show badge for completed episodes
  if (status === 'completed') {
    return null
  }

  const meta = getSTATUS_META(t)[status ?? 'unknown']
  return (
    <Badge
      variant="outline"
      className={cn('uppercase tracking-wide text-xs', meta.className)}
    >
      {meta.label}
    </Badge>
  )
}

type OutlineSegment = {
  name?: string
  description?: string
  size?: string
}

type OutlineData = {
  segments?: OutlineSegment[]
}

type TranscriptEntry = {
  speaker?: string
  dialogue?: string
}

type TranscriptData = {
  transcript?: TranscriptEntry[]
}

function extractOutlineSegments(outline: unknown): OutlineSegment[] {
  if (outline && typeof outline === 'object' && 'segments' in outline) {
    const data = outline as OutlineData
    if (Array.isArray(data.segments)) {
      return data.segments
    }
  }
  return []
}

/**
 * "provider / name" label for a snapshot model row. Prefers the display
 * fields the API resolves from the snapshot's model references, falls back
 * to the legacy snapshot strings (pre-#1107 episodes), then to a dash.
 */
function formatModelLabel(
  provider?: string | null,
  name?: string | null,
  legacyProvider?: string | null,
  legacyName?: string | null
): string {
  return `${provider || legacyProvider || '—'} / ${name || legacyName || '—'}`
}

function extractTranscriptEntries(transcript: unknown): TranscriptEntry[] {
  if (transcript && typeof transcript === 'object' && 'transcript' in transcript) {
    const data = transcript as TranscriptData
    if (Array.isArray(data.transcript)) {
      return data.transcript
    }
  }
  return []
}

export function EpisodeCard({ episode, onDelete, deleting, onRetry, retrying, onCancel, cancelling }: EpisodeCardProps) {
  const { t, language } = useTranslation()
  const [audioSrc, setAudioSrc] = useState<string | undefined>()
  const [audioError, setAudioError] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const outlineSegments = useMemo(() => extractOutlineSegments(episode.outline), [episode.outline])
  const transcriptEntries = useMemo(() => extractTranscriptEntries(episode.transcript), [episode.transcript])

  const displayErrorMessage = useMemo(() => {
    if (!episode.error_message) return '';
    const msg = episode.error_message;
    const isQuotaError = (msg.includes('429') && (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota exceeded') || msg.includes('rate limit'))) || msg.includes('exhausted their Quota');
    if (isQuotaError) {
      return 'Quá trình tạo thất bại do tài khoản API đã hết hạn mức sử dụng (Hết Quota / Rate Limit) và không có Mô hình dự phòng nào khả dụng. Vui lòng thêm cấu hình API Key mới trong Cài đặt hoặc thử lại sau.';
    }
    return msg;
  }, [episode.error_message]);

  useEffect(() => {
    let revokeUrl: string | undefined
    setAudioError(null)

    // If backend exposed a protected endpoint, fetch it with auth headers
    const loadProtectedAudio = async () => {
      // First resolve the audio URL
      const directAudioUrl = await resolvePodcastAssetUrl(episode.audio_url ?? episode.audio_file)

      if (!directAudioUrl || !episode.audio_url) {
        setAudioSrc(directAudioUrl)
        return
      }

      try {
        // apiClient attaches the auth header; directAudioUrl is absolute so
        // the dynamic baseURL is ignored.
        const response = await apiClient.get<Blob>(directAudioUrl, {
          responseType: 'blob',
        })

        revokeUrl = URL.createObjectURL(response.data)
        setAudioSrc(revokeUrl)
      } catch (error) {
        console.error('Unable to load podcast audio', error)
        setAudioError(t('podcasts.audioUnavailable'))
        setAudioSrc(undefined)
      }
    }

    void loadProtectedAudio()

    return () => {
      if (revokeUrl) {
        URL.revokeObjectURL(revokeUrl)
      }
    }
  }, [episode.audio_url, episode.audio_file, t])

  const distance = episode.created
    ? formatDistanceToNow(new Date(episode.created), {
        addSuffix: true,
        locale: getDateLocale(language),
      })
    : null

  const createdLabel = distance
    ? t('podcasts.created', { time: distance })
    : null

  const handleDelete = () => {
    void onDelete(episode.id)
  }

  const handleRetry = () => {
    if (onRetry) {
      void onRetry(episode.id)
    }
  }

  const isFailed = FAILED_EPISODE_STATUSES.includes(episode.job_status as EpisodeStatus)
  const isActive = episode.job_status ? ['running', 'processing', 'pending', 'submitted'].includes(episode.job_status) : false
  const isDone = episode.job_status === 'completed'

  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-500", 
      isActive 
        ? "border-teal/40 shadow-[0_4px_20px_-4px_rgba(14,114,104,0.15)] dark:shadow-[0_4px_20px_-4px_rgba(63,179,165,0.15)] bg-gradient-to-r from-background via-teal/5 to-background" 
        : isFailed 
          ? "border-destructive/40 shadow-sm" 
          : "hover:border-primary/40 hover:shadow-md"
    )}>
      <CardContent className="space-y-4 p-3 pb-3 relative">
        {/* Top-aligned progress bar for active state */}
        {isActive && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-teal/10 overflow-hidden">
            <div className="h-full bg-teal w-1/2 animate-progress-indeterminate shadow-[0_0_10px_rgba(14,114,104,0.5)]"></div>
          </div>
        )}
        
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-1">
          <div className="flex items-start gap-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold leading-none tracking-tight">
                  {episode.name}
                </h3>
                <StatusBadge status={episode.job_status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {t('podcasts.profile')}: <span className="font-medium">{episode.episode_profile?.name || t('common.unknown')}</span>
                {createdLabel ? ` • ${createdLabel}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {isActive && (
              <>
                <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-2 border-teal/30 text-teal hover:bg-teal/10 hover:text-teal"
                    >
                      <IconInfoCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Chi tiết</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[min(90vw,720px)] max-h-[85vh] overflow-hidden">
                    <DialogHeader>
                      <DialogTitle>{episode.name}</DialogTitle>
                      <DialogDescription>
                        {episode.episode_profile?.name || t('common.unknown')}
                        {createdLabel ? ` • ${createdLabel}` : ''}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 overflow-hidden">
                      {episode.command_id ? (
                        <ActiveJobProgressViewer commandId={episode.command_id} />
                      ) : (
                        <p className="text-sm text-muted-foreground">Không có ID tiến trình để theo dõi.</p>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
                
                {onCancel && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => onCancel(episode.id)}
                    disabled={cancelling}
                  >
                    {cancelling ? <IconLoader2 className="h-4 w-4 animate-spin" /> : <IconTrash className="h-4 w-4" />}
                    <span className="hidden sm:inline">Huỷ</span>
                  </Button>
                )}
              </>
            )}
            
            {isFailed && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleRetry}
                disabled={retrying}
              >
                <IconRefresh className={cn("h-4 w-4", retrying && "animate-spin")} />
                {retrying ? t('podcasts.retrying') : t('podcasts.retry')}
              </Button>
            )}
            
            {isDone && (
              <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-2">
                    <IconInfoCircle className="h-4 w-4" /> <span className="hidden sm:inline">{t('podcasts.details')}</span>
                  </Button>
                </DialogTrigger>
              <DialogContent className="w-[min(90vw,720px)] max-h-[85vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle>{episode.name}</DialogTitle>
                  <DialogDescription>
                    {episode.episode_profile?.name || t('common.unknown')}
                    {createdLabel ? ` • ${createdLabel}` : ''}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 overflow-hidden">
                  {audioSrc ? (
                    <div className="rounded-md border bg-card p-2">
                      <audio controls preload="none" src={audioSrc} className="w-full" />
                    </div>
                  ) : audioError ? (
                    <p className="text-sm text-destructive">{audioError}</p>
                  ) : null}

                  <Tabs defaultValue="summary" className="h-[60vh] flex flex-col">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="summary">{t('podcasts.summaryTab')}</TabsTrigger>
                      <TabsTrigger value="outline">{t('podcasts.outlineTab')}</TabsTrigger>
                      <TabsTrigger value="transcript">{t('podcasts.transcriptTab')}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="summary" className="flex-1 overflow-hidden">
                      <ScrollArea className="h-full pr-4">
                        <div className="space-y-6">
                          <section className="space-y-2">
                            <h4 className="text-sm font-semibold text-foreground">{t('podcasts.episodeProfile')}</h4>
                            <div className="grid gap-2 text-sm md:grid-cols-2">
                              <div>
                                <p className="text-muted-foreground">{t('podcasts.outlineModel')}</p>
                                <p>
                                  {formatModelLabel(
                                    episode.episode_profile?.outline_model_provider,
                                    episode.episode_profile?.outline_model_name,
                                    episode.episode_profile?.outline_provider,
                                    episode.episode_profile?.outline_model
                                  )}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">{t('podcasts.transcriptModel')}</p>
                                <p>
                                  {formatModelLabel(
                                    episode.episode_profile?.transcript_model_provider,
                                    episode.episode_profile?.transcript_model_name,
                                    episode.episode_profile?.transcript_provider,
                                    episode.episode_profile?.transcript_model
                                  )}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">{t('podcasts.segments')}</p>
                                <p>{episode.episode_profile?.num_segments ?? '—'}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">{t('podcasts.maxTokens')}</p>
                                <p>{episode.episode_profile?.max_tokens ?? '—'}</p>
                              </div>
                            </div>
                            {episode.episode_profile?.default_briefing ? (
                              <div className="rounded border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
                                {episode.episode_profile.default_briefing}
                              </div>
                            ) : null}
                          </section>

                          <section className="space-y-2">
                            <h4 className="text-sm font-semibold text-foreground">{t('podcasts.speakerProfile')}</h4>
                            <p className="text-xs text-muted-foreground">
                              {formatModelLabel(
                                episode.speaker_profile?.voice_model_provider,
                                episode.speaker_profile?.voice_model_name,
                                episode.speaker_profile?.tts_provider,
                                episode.speaker_profile?.tts_model
                              )}
                            </p>
                            {episode.speaker_profile?.speakers?.map((speaker, index) => (
                              <div
                                key={`${speaker.name}-${index}`}
                                className="rounded-md border bg-muted/20 p-3 text-xs"
                              >
                                <p className="font-semibold text-foreground">{speaker.name}</p>
                                <p className="text-muted-foreground">{t('podcasts.voiceId')}: {speaker.voice_id}</p>
                                <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                                  <span className="font-semibold">{t('podcasts.backstory')}:</span> {speaker.backstory}
                                </p>
                                <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                                  <span className="font-semibold">{t('podcasts.personality')}:</span> {speaker.personality}
                                </p>
                              </div>
                            ))}
                          </section>

                          {episode.briefing ? (
                            <section className="space-y-2">
                              <h4 className="text-sm font-semibold text-foreground">{t('podcasts.briefing')}</h4>
                              <div className="rounded border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
                                {episode.briefing}
                              </div>
                            </section>
                          ) : null}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="outline" className="flex-1 overflow-hidden">
                      <ScrollArea className="h-full pr-4">
                        {outlineSegments.length > 0 ? (
                          <div className="space-y-3">
                            {outlineSegments.map((segment, index) => (
                              <div key={index} className="rounded border bg-muted/20 p-3 text-xs space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-semibold text-foreground">{segment.name ?? `${t('podcasts.segment')} ${index + 1}`}</p>
                                  {segment.size ? (
                                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">{segment.size}</Badge>
                                  ) : null}
                                </div>
                                <p className="text-muted-foreground whitespace-pre-wrap">{segment.description ?? t('podcasts.noDescription')}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">{t('podcasts.noOutline')}</p>
                        )}
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="transcript" className="flex-1 overflow-hidden">
                      <ScrollArea className="h-full pr-4 space-y-3">
                        {transcriptEntries.length > 0 ? (
                          transcriptEntries.map((entry, index) => (
                            <div key={index} className="rounded border bg-muted/20 p-3 text-xs space-y-1">
                              <p className="font-semibold text-foreground">{entry.speaker ?? t('podcasts.speaker')}</p>
                              <p className="text-muted-foreground whitespace-pre-wrap">{entry.dialogue ?? ''}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground">{t('podcasts.noTranscript')}</p>
                        )}
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </div>
              </DialogContent>
            </Dialog>
            )}
            {isDone && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <IconTrash className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('podcasts.deleteEpisodeTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('podcasts.deleteEpisodeDesc', { name: episode.name })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                      {deleting ? t('podcasts.deleting') : t('podcasts.delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {isFailed && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <IconTrash className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('podcasts.deleteEpisodeTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('podcasts.deleteEpisodeDesc', { name: episode.name })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                      {deleting ? t('podcasts.deleting') : t('podcasts.delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

          </div>
        </div>

        {isDone && audioSrc ? (
          <div className="rounded-lg bg-muted/50 p-2">
            <audio controls preload="none" src={audioSrc} className="h-10 w-full" />
          </div>
        ) : audioError ? (
          <p className="text-sm text-destructive">{audioError}</p>
        ) : null}

        {isFailed && displayErrorMessage ? (
          <div className="rounded-md border border-destructive/30 bg-destructive-tint p-2.5 mt-2 relative group">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-destructive">{t('podcasts.errorDetails')}</p>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => navigator.clipboard.writeText(displayErrorMessage)}
                title="Copy error message"
              >
                <IconCopy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="mt-0.5 text-xs whitespace-pre-wrap text-destructive opacity-90 pr-2">{displayErrorMessage}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

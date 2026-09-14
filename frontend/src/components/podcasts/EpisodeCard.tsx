'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { getDateLocale } from '@/lib/utils/date-locale'
import {
  IconCopy,
  IconCircleCheck,
  IconClock,
  IconHeadphones,
  IconInfoCircle,
  IconListDetails,
  IconLoader2,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react'

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

function ActiveJobProgressViewer({
  commandId,
  episode,
}: {
  commandId: string
  episode: PodcastEpisode
}) {
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

  const status = String(progress.status ?? 'running').toLowerCase()
  const isFinished = status === 'completed'
  const outlineSegments = extractOutlineSegments(episode.outline)
  const expectedSegments = Math.max(episode.episode_profile?.num_segments ?? 0, outlineSegments.length)

  const steps = [
    { label: t('podcasts.summaryTab'), done: true, active: false },
    { label: t('podcasts.outlineGeneration'), done: outlineSegments.length > 0 || isFinished, active: !isFinished && outlineSegments.length === 0 },
    { label: t('podcasts.transcriptGeneration'), done: Boolean(episode.transcript) || isFinished, active: !isFinished && outlineSegments.length > 0 && !episode.transcript },
    { label: 'Eric · Luna', done: isFinished, active: !isFinished && Boolean(episode.transcript) },
  ]

  return (
    <div className="space-y-5 rounded-xl border bg-muted/20 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal/10">
          <IconLoader2 className="h-5 w-5 animate-spin text-teal" />
        </div>
        <div>
          <h4 className="text-sm font-semibold">{t('podcasts.processingLabel')}</h4>
          <p className="text-xs text-muted-foreground">
            {t('podcasts.statusRunningDesc')}
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {steps.map((step, index) => (
          <div key={step.label} className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2.5">
            <div className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
              step.done && 'border-fern/30 bg-fern-tint text-fern',
              step.active && 'border-teal/30 bg-teal-tint text-teal',
              !step.done && !step.active && 'bg-muted text-muted-foreground'
            )}>
              {step.done ? <IconCircleCheck className="h-4 w-4" /> : step.active ? <IconLoader2 className="h-4 w-4 animate-spin" /> : <IconClock className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-foreground">{step.label}</p>
              <p className="text-[11px] text-muted-foreground">{t('podcasts.segment')} {index + 1}/4</p>
            </div>
          </div>
        ))}
      </div>

      {expectedSegments > 0 ? (
        <div className="rounded-lg border bg-background p-3">
          <div className="mb-3 flex items-center gap-2">
            <IconListDetails className="h-4 w-4 text-teal" />
            <p className="text-xs font-semibold">{t('podcasts.outlineTab')} · {expectedSegments} {t('podcasts.segments').toLocaleLowerCase()}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {Array.from({ length: expectedSegments }, (_, index) => {
              const segment = outlineSegments[index]
              return (
                <div key={index} className="rounded-md bg-muted/50 px-3 py-2">
                  <p className="truncate text-xs font-medium">{segment?.name ?? `${t('podcasts.segment')} ${index + 1}`}</p>
                  {segment?.description ? <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{segment.description}</p> : null}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
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

function getSpeakerDisplayName(speaker: { name?: string; voice_id?: string }, index: number): string {
  const voice = `${speaker.voice_id ?? ''} ${speaker.name ?? ''}`.toLowerCase()
  if (/hoa.?my|jenny|female|nữ|woman/.test(voice)) return 'Luna'
  if (/nam.?minh|guy|male|nam|man/.test(voice)) return 'Eric'
  if (index === 0) return 'Eric'
  if (index === 1) return 'Luna'
  return speaker.name || `${index + 1}`
}

export function replaceLegacySpeakerNames(text: string, speakerNames: Map<string, string>): string {
  let nextText = text
    .replace(/\bMarcus\b/gi, 'Eric')
    .replace(/\bElena\b/gi, 'Luna')
  const replacements = new Map(speakerNames)
  replacements.set('marcus', 'Eric')
  replacements.set('elena', 'Luna')

  for (const [legacyName, displayName] of replacements) {
    if (!legacyName || legacyName.toLocaleLowerCase() === displayName.toLocaleLowerCase()) continue
    const escapedName = legacyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    nextText = nextText.replace(new RegExp(escapedName, 'gi'), displayName)
  }

  return nextText
}

export function EpisodeCard({ episode, onDelete, deleting, onRetry, retrying, onCancel, cancelling }: EpisodeCardProps) {
  const { t, language } = useTranslation()
  const [audioSrc, setAudioSrc] = useState<string | undefined>()
  const [audioError, setAudioError] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const outlineSegments = useMemo(() => extractOutlineSegments(episode.outline), [episode.outline])
  const transcriptEntries = useMemo(() => extractTranscriptEntries(episode.transcript), [episode.transcript])
  const speakerNames = useMemo(
    () => new Map(
      (episode.speaker_profile?.speakers ?? []).map((speaker, index) => [
        speaker.name.trim().toLocaleLowerCase(),
        getSpeakerDisplayName(speaker, index),
      ])
    ),
    [episode.speaker_profile?.speakers]
  )

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
      "group overflow-hidden border-l-2 bg-card transition-colors duration-150",
      isActive 
        ? "border-foreground/50"
        : isFailed 
          ? "border-destructive"
          : "border-foreground/20 hover:border-foreground/40"
    )}>
      <CardContent className="relative space-y-4 p-4 sm:p-5">
        {/* Top-aligned progress bar for active state */}
        {isActive && (
          <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-muted">
            <div className="h-full w-1/2 animate-progress-indeterminate bg-foreground/70" />
          </div>
        )}
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <div className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
              isActive && "border-teal/20 bg-teal/10 text-teal",
              isFailed && "border-destructive/20 bg-destructive/10 text-destructive",
              isDone && "border-primary/15 bg-primary/10 text-primary"
            )}>
              {isActive ? (
                <IconLoader2 className="h-5 w-5 animate-spin" />
              ) : (
                <IconHeadphones className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-display text-base font-semibold leading-tight tracking-tight sm:text-lg">
                  {episode.name}
                </h3>
                <StatusBadge status={episode.job_status} />
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span className="rounded-md bg-muted px-2 py-1 font-medium text-foreground/80">
                  {episode.episode_profile?.name || t('common.unknown')}
                </span>
                {createdLabel ? <span>{createdLabel}</span> : null}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
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
                        <ActiveJobProgressViewer commandId={episode.command_id} episode={episode} />
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
                    <div className="rounded-xl border bg-muted/30 p-2">
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
                                <p className="font-semibold text-foreground">{getSpeakerDisplayName(speaker, index)}</p>
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
                              <p className="font-semibold text-foreground">
                                {entry.speaker
                                  ? speakerNames.get(entry.speaker.trim().toLocaleLowerCase()) ?? entry.speaker
                                  : t('podcasts.speaker')}
                              </p>
                              <p className="whitespace-pre-wrap text-muted-foreground">
                                {replaceLegacySpeakerNames(entry.dialogue ?? '', speakerNames)}
                              </p>
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
          <div className="rounded-xl border bg-muted/30 p-2.5 transition-colors group-hover:bg-muted/50">
            <audio controls preload="metadata" src={audioSrc} className="h-10 w-full accent-primary" />
          </div>
        ) : audioError ? (
          <p className="text-sm text-destructive">{audioError}</p>
        ) : null}

        {isFailed && displayErrorMessage ? (
          <div className="relative mt-2 rounded-xl border border-destructive/30 bg-destructive-tint p-3">
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

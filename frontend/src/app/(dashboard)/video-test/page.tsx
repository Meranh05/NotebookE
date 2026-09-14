'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from '@/lib/hooks/use-translation'
import apiClient from '@/lib/api/client'
import { getApiUrl } from '@/lib/config'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  IconAlertTriangle,
  IconVideo,
  IconDownload,
  IconLoader2,
  IconInfoCircle,
  IconCheck,
  IconX,
} from '@tabler/icons-react'

// ── Types ──────────────────────────────────────────────────────────────────

interface GenerateResponse {
  operation_id: string
  status: string
  message: string
}

interface StatusResponse {
  operation_id: string
  done: boolean
  status: 'pending' | 'completed' | 'failed'
  error?: string
  has_video: boolean
}

interface CredentialInfo {
  id: string
  name: string
  provider: string
}

type PageStatus = 'idle' | 'generating' | 'polling' | 'completed' | 'failed'

// ── Component ──────────────────────────────────────────────────────────────

export default function VideoTestPage() {
  const { t } = useTranslation()

  // form state
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState('veo-3.1-generate-preview')
  const [duration, setDuration] = useState('8')
  const [aspectRatio, setAspectRatio] = useState('16:9')

  // job state
  const [pageStatus, setPageStatus] = useState<PageStatus>('idle')
  const [operationId, setOperationId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)
  const [credentials, setCredentials] = useState<CredentialInfo[]>([])
  const [usedCredential, setUsedCredential] = useState<string | null>(null)
  const [apiBaseUrl, setApiBaseUrl] = useState<string>('http://localhost:5055')

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Load credentials on mount ──────────────────────────────────────────

  useEffect(() => {
    getApiUrl().then((url) => setApiBaseUrl(url)).catch(() => {})
    apiClient
      .get<CredentialInfo[]>('/video-test/credentials')
      .then((res) => setCredentials(res.data))
      .catch(() => setCredentials([]))
  }, [])

  // ── Poll ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (pageStatus !== 'polling' || !operationId) return

    pollRef.current = setInterval(async () => {
      try {
        const res = await apiClient.get<StatusResponse>(
          `/video-test/status/${operationId}`
        )
        const data = res.data

        if (data.status === 'completed' && data.has_video) {
          clearInterval(pollRef.current!)
          setPageStatus('completed')
        } else if (data.status === 'failed') {
          clearInterval(pollRef.current!)
          setErrorMsg(data.error ?? 'Unknown error')
          setPageStatus('failed')
        }
        // still pending → keep polling
      } catch (err: unknown) {
        clearInterval(pollRef.current!)
        const message =
          err instanceof Error ? err.message : 'Polling request failed'
        setErrorMsg(message)
        setPageStatus('failed')
      }
    }, 5000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [pageStatus, operationId])

  // ── Submit ─────────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!prompt.trim()) return
    setPageStatus('generating')
    setErrorMsg(null)
    setDebugInfo(null)
    setOperationId(null)

    try {
      const res = await apiClient.post<GenerateResponse>('/video-test/generate', {
        prompt: prompt.trim(),
        model,
        duration_seconds: parseInt(duration, 10),
        aspect_ratio: aspectRatio,
      })

      const { operation_id, message } = res.data
      setOperationId(operation_id)
      setDebugInfo(message)

      // Detect which credential was used (shown in the log message)
      const credMatch = message.match(/credential[:\s]+(\S+)/i)
      if (credMatch) setUsedCredential(credMatch[1])

      setPageStatus('polling')
    } catch (err: unknown) {
      let detail = 'Request failed'
      if (
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data &&
        typeof err.response.data === 'object' &&
        'detail' in err.response.data
      ) {
        detail = String((err.response as { data: { detail: unknown } }).data.detail)
      } else if (err instanceof Error) {
        detail = err.message
      }
      setErrorMsg(detail)
      setPageStatus('failed')
    }
  }

  // ── Download ───────────────────────────────────────────────────────────

  async function handleDownload() {
    if (!operationId) return
    window.open(`${apiBaseUrl}/api/video-test/download/${operationId}`, '_blank')
  }

  const isRunning = pageStatus === 'generating' || pageStatus === 'polling'

  // ── Render ─────────────────────────────────────────────────────────────

  return (
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6 max-w-2xl mx-auto space-y-6">

          {/* Header */}
          <header className="space-y-1">
            <div className="flex items-center gap-2">
              <IconVideo className="h-6 w-6 text-primary" />
              <h1 className="font-display text-2xl font-bold tracking-tight">
                {t('videoTest.title')}
              </h1>
              <Badge variant="outline" className="ml-2 text-xs">
                POC
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              {t('videoTest.description')}
            </p>
          </header>

          {/* Credentials found */}
          {credentials.length > 0 && (
            <Alert>
              <IconInfoCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {t('videoTest.credentialUsed')}:{' '}
                <span className="font-semibold">
                  {credentials.map((c) => c.name).join(', ')}
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <div className="space-y-4 rounded-lg border p-5">

            {/* Prompt */}
            <div className="space-y-2">
              <Label htmlFor="veo-prompt">{t('videoTest.promptLabel')}</Label>
              <Textarea
                id="veo-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t('videoTest.promptPlaceholder')}
                rows={3}
                disabled={isRunning}
              />
            </div>

            {/* Row: model + duration + aspect */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('videoTest.modelLabel')}</Label>
                <Select
                  value={model}
                  onValueChange={setModel}
                  disabled={isRunning}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="veo-3.1-generate-preview">veo-3.1 (preview, audio)</SelectItem>
                    <SelectItem value="veo-3.1-fast-generate-preview">veo-3.1-fast (preview, audio)</SelectItem>
                    <SelectItem value="veo-3.1-lite-generate-preview">veo-3.1-lite (preview, audio)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('videoTest.durationLabel')}</Label>
                <Select
                  value={duration}
                  onValueChange={setDuration}
                  disabled={isRunning}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4s</SelectItem>
                    <SelectItem value="6">6s</SelectItem>
                    <SelectItem value="8">8s</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('videoTest.aspectRatioLabel')}</Label>
                <Select
                  value={aspectRatio}
                  onValueChange={setAspectRatio}
                  disabled={isRunning}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16:9">16:9 Landscape</SelectItem>
                    <SelectItem value="9:16">9:16 Portrait</SelectItem>
                    <SelectItem value="1:1">1:1 Square</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Submit */}
            <Button
              onClick={handleGenerate}
              disabled={isRunning || !prompt.trim()}
              className="w-full"
            >
              {isRunning ? (
                <>
                  <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
                  {pageStatus === 'generating'
                    ? t('videoTest.generating')
                    : t('videoTest.polling')}
                </>
              ) : (
                <>
                  <IconVideo className="h-4 w-4 mr-2" />
                  {t('videoTest.generate')}
                </>
              )}
            </Button>
          </div>

          {/* Status badge */}
          {pageStatus !== 'idle' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t('videoTest.statusLabel')}:
              </span>
              {pageStatus === 'polling' && (
                <Badge variant="secondary" className="gap-1">
                  <IconLoader2 className="h-3 w-3 animate-spin" />
                  {t('videoTest.pendingStatus')}
                </Badge>
              )}
              {pageStatus === 'completed' && (
                <Badge variant="default" className="gap-1 bg-green-600">
                  <IconCheck className="h-3 w-3" />
                  {t('videoTest.completedStatus')}
                </Badge>
              )}
              {pageStatus === 'failed' && (
                <Badge variant="destructive" className="gap-1">
                  <IconX className="h-3 w-3" />
                  {t('videoTest.failedStatus')}
                </Badge>
              )}
            </div>
          )}

          {/* Error */}
          {pageStatus === 'failed' && errorMsg && (
            <Alert variant="destructive">
              <IconAlertTriangle className="h-4 w-4" />
              <AlertTitle>{t('videoTest.errorTitle')}</AlertTitle>
              <AlertDescription className="text-sm break-words">
                {errorMsg}
              </AlertDescription>
            </Alert>
          )}

          {/* Completed: video preview + download */}
          {pageStatus === 'completed' && operationId && (
            <div className="space-y-3">
              <video
                controls
                autoPlay
                className="w-full rounded-lg border bg-black"
                src={`${apiBaseUrl}/api/video-test/download/${operationId}`}
              />
              <Button
                variant="outline"
                onClick={handleDownload}
                className="w-full"
              >
                <IconDownload className="h-4 w-4 mr-2" />
                {t('videoTest.downloadBtn')}
              </Button>
            </div>
          )}

          {/* Debug info */}
          {debugInfo && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer select-none mb-1 font-medium">
                {t('videoTest.responseDebug')}
              </summary>
              <pre className="bg-muted rounded p-3 overflow-auto whitespace-pre-wrap break-words">
                {debugInfo}
              </pre>
            </details>
          )}

          {/* Notes */}
          <div className="rounded-lg border p-4 space-y-2 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">{t('videoTest.notesTitle')}</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{t('videoTest.note1')}</li>
              <li>{t('videoTest.note2')}</li>
              <li>{t('videoTest.note3')}</li>
            </ul>
            <p className="italic text-xs pt-1">{t('videoTest.disclaimer')}</p>
          </div>

        </div>
      </div>
  )
}

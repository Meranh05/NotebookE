'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { sourcesApi } from '@/lib/api/sources'
import { QUERY_KEYS } from '@/lib/api/query-client'
import { useSource, useUpdateSource, useDeleteSource } from '@/lib/hooks/use-sources'
import { insightsApi, SourceInsightResponse } from '@/lib/api/insights'
import { transformationsApi } from '@/lib/api/transformations'
import { embeddingApi } from '@/lib/api/embedding'
import { SourceDetailResponse } from '@/lib/types/api'
import { Transformation } from '@/lib/types/transformations'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ContentUnavailable } from '@/components/common/ContentUnavailable'
import { isNotFoundError } from '@/lib/utils/error-handler'
import { InlineEdit } from '@/components/common/InlineEdit'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IconAlertCircle, IconAlignLeft, IconBulb, IconCircleCheck, IconCopy, IconDatabase, IconDotsVertical, IconDownload, IconExternalLink, IconLink, IconMaximize, IconMessage, IconPlus, IconRotateClockwise, IconSparkles, IconTrash, IconUpload, IconZoomIn, IconZoomOut } from '@tabler/icons-react'
import { formatDistanceToNow } from 'date-fns'
import { getDateLocale } from '@/lib/utils/date-locale'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/hooks/use-translation'
import { SourceInsightDialog } from '@/components/sources/SourceInsightDialog'
import { NotebookAssociations } from '@/components/sources/NotebookAssociations'

// ─── Image file detection ────────────────────────────────────────────────────
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'tif', 'svg', 'avif'])
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'm4a', 'ogg', 'aac', 'flac'])
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'avi', 'mkv', 'wmv'])

function getFilenameFromPath(path: string | undefined): string {
  if (!path) return ''
  return path.split(/[\/\\]/).pop() ?? ''
}

function isImageSource(filePath: string | undefined): boolean {
  const ext = getFilenameFromPath(filePath).split('.').pop()?.toLowerCase() ?? ''
  return IMAGE_EXTENSIONS.has(ext)
}

function isPdfSource(filePath: string | undefined): boolean {
  return getFilenameFromPath(filePath).split('.').pop()?.toLowerCase() === 'pdf'
}

function isDocxSource(filePath: string | undefined): boolean {
  return getFilenameFromPath(filePath).split('.').pop()?.toLowerCase() === 'docx'
}

function getMediaType(filePath: string | undefined): 'audio' | 'video' | null {
  const ext = getFilenameFromPath(filePath).split('.').pop()?.toLowerCase() ?? ''
  if (AUDIO_EXTENSIONS.has(ext)) return 'audio'
  if (VIDEO_EXTENSIONS.has(ext)) return 'video'
  return null
}

const DOCUMENT_ZOOM_MIN = 50
const DOCUMENT_ZOOM_MAX = 200
const DOCUMENT_ZOOM_STEP = 10

function useDocumentZoom() {
  const viewportRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef(100)
  const [zoom, setZoomState] = useState(100)

  const setZoom = useCallback((value: number) => {
    const nextZoom = Math.min(DOCUMENT_ZOOM_MAX, Math.max(DOCUMENT_ZOOM_MIN, value))
    zoomRef.current = nextZoom
    setZoomState(nextZoom)
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey || !event.altKey) return

      event.preventDefault()
      const previousZoom = zoomRef.current
      const nextZoom = Math.min(
        DOCUMENT_ZOOM_MAX,
        Math.max(DOCUMENT_ZOOM_MIN, previousZoom + (event.deltaY < 0 ? DOCUMENT_ZOOM_STEP : -DOCUMENT_ZOOM_STEP))
      )
      if (nextZoom === previousZoom) return

      const bounds = viewport.getBoundingClientRect()
      const pointerX = event.clientX - bounds.left
      const pointerY = event.clientY - bounds.top
      const documentX = viewport.scrollLeft + pointerX
      const documentY = viewport.scrollTop + pointerY
      const ratio = nextZoom / previousZoom

      setZoom(nextZoom)
      requestAnimationFrame(() => {
        viewport.scrollLeft = documentX * ratio - pointerX
        viewport.scrollTop = documentY * ratio - pointerY
      })
    }

    viewport.addEventListener('wheel', handleWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', handleWheel)
  }, [setZoom])

  return { viewportRef, zoom, setZoom }
}

function DocumentZoomControls({
  zoom,
  onZoomChange,
  labels,
}: {
  zoom: number
  onZoomChange: (value: number) => void
  labels: { group: string; out: string; in: string; reset: string }
}) {
  return (
    <div className="flex items-center rounded-lg border bg-muted/30 p-0.5" aria-label={labels.group}>
      <button
        type="button"
        onClick={() => onZoomChange(zoom - DOCUMENT_ZOOM_STEP)}
        disabled={zoom <= DOCUMENT_ZOOM_MIN}
        className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
        aria-label={labels.out}
        title={labels.out}
      >
        <IconZoomOut className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onZoomChange(100)}
        className="h-6 min-w-11 rounded-md px-1 text-[10px] font-semibold tabular-nums text-foreground transition-colors hover:bg-accent"
        title={labels.reset}
      >
        {zoom}%
      </button>
      <button
        type="button"
        onClick={() => onZoomChange(zoom + DOCUMENT_ZOOM_STEP)}
        disabled={zoom >= DOCUMENT_ZOOM_MAX}
        className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
        aria-label={labels.in}
        title={labels.in}
      >
        <IconZoomIn className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function DocumentLoadingSkeleton({ label }: { label: string }) {
  return (
    <div className="flex min-h-[24rem] items-start justify-center overflow-hidden rounded-xl border bg-slate-200/70 p-4 dark:bg-slate-950/60" aria-busy="true">
      <div className="w-full max-w-[42rem] animate-pulse rounded-lg border bg-white px-[9%] py-10 shadow-sm dark:bg-slate-900">
        <div className="mx-auto mb-8 h-4 w-2/5 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="space-y-3">
          <div className="h-2.5 w-full rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-2.5 w-11/12 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-2.5 w-full rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-2.5 w-4/5 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="mt-10 grid grid-cols-3 gap-2">
          <div className="h-20 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="h-20 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="h-20 rounded bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="mt-8 flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
          <LoadingSpinner className="h-4 w-4 text-teal" />
          <span>{label}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Image viewer component ──────────────────────────────────────────────────
function ImageSourceViewer({ sourceId, filename }: { sourceId: string; filename: string }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)

    sourcesApi.downloadFile(sourceId)
      .then(response => {
        if (cancelled) return
        const url = URL.createObjectURL(response.data)
        urlRef.current = url
        setImgUrl(url)
      })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => {
      cancelled = true
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current)
        urlRef.current = null
      }
    }
  }, [sourceId])

  const handleDownload = () => {
    if (!imgUrl) return
    const a = document.createElement('a')
    a.href = imgUrl
    a.download = filename
    a.click()
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-muted/30">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm">Đang tải ảnh...</span>
        </div>
      </div>
    )
  }

  if (error || !imgUrl) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-muted-foreground">
        <span className="text-sm">Không thể tải ảnh</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-1">
        <div className="flex items-center gap-1 bg-muted/60 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
            title="Thu nhỏ"
          >
            <IconZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs font-semibold text-foreground min-w-[3rem] text-center tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom(z => Math.min(4, z + 0.25))}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
            title="Phóng to"
          >
            <IconZoomIn className="h-4 w-4" />
          </button>
          <div className="w-px h-5 bg-border mx-1" />
          <button
            type="button"
            onClick={() => setRotation(r => (r + 90) % 360)}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
            title="Xoay 90°"
          >
            <IconRotateClockwise className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => { setZoom(1); setRotation(0) }}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
            title="Đặt lại"
          >
            <IconMaximize className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleDownload}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-2 rounded-xl transition-colors"
        >
          <IconDownload className="h-3.5 w-3.5" />
          Tải xuống
        </button>
      </div>

      {/* Image container */}
      <div className="flex min-h-[300px] max-h-[70vh] items-center justify-center overflow-auto rounded-lg border border-border bg-muted/40 p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgUrl}
          alt={filename}
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transformOrigin: 'center',
            transition: 'transform 0.2s ease',
            maxWidth: '100%',
            objectFit: 'contain',
          }}
        />
      </div>
      <p className="text-center text-xs text-muted-foreground">{filename}</p>
    </div>
  )
}

function PdfSourceViewer({ sourceId, filename }: { sourceId: string; filename: string }) {
  const { t } = useTranslation()
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [visiblePages, setVisiblePages] = useState(3)
  const [layout, setLayout] = useState<'single' | 'double'>('single')
  const { viewportRef, zoom, setZoom } = useDocumentZoom()

  useEffect(() => {
    if (layout === 'double' && visiblePages % 2 !== 0) {
      setVisiblePages(pages => Math.min(pages + 1, pageCount ?? pages + 1))
    }
  }, [layout, pageCount, visiblePages])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    setPageCount(null)
    setVisiblePages(3)

    sourcesApi.getPdfPreviewInfo(sourceId)
      .then(info => {
        if (cancelled) return
        setPageCount(info.page_count)
      })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => {
      cancelled = true
    }
  }, [sourceId])

  if (loading) {
    return <DocumentLoadingSkeleton label={t('sources.pdfLoading')} />
  }

  if (error || !pageCount) {
    return (
      <div className="flex min-h-[12rem] items-center justify-center rounded-lg border border-dashed bg-muted/10 px-6 text-center text-sm text-muted-foreground">
        {t('sources.pdfPreviewError')}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-1.5 rounded-md border bg-card px-2 py-1.5" role="toolbar" aria-label={t('sources.pdfLayout')}>
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span className="rounded-sm border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">PDF</span>
          <span className="hidden font-medium sm:inline">{t('sources.pageCount', { count: pageCount })}</span>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 text-xs text-muted-foreground">
          <DocumentZoomControls
            zoom={zoom}
            onZoomChange={setZoom}
            labels={{ group: t('sources.documentZoom'), out: t('sources.zoomOut'), in: t('sources.zoomIn'), reset: t('sources.resetZoom') }}
          />
          <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-0.5" aria-label={t('sources.pdfLayout')}>
            <button
              type="button"
              onClick={() => setLayout('single')}
              className={`rounded-md px-2.5 py-1.5 font-medium transition-colors ${layout === 'single' ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
            >
              {t('sources.singlePage')}
            </button>
            <button
              type="button"
              onClick={() => setLayout('double')}
              className={`rounded-md px-2.5 py-1.5 font-medium transition-colors ${layout === 'double' ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
            >
              {t('sources.twoPages')}
            </button>
          </div>
        </div>
      </div>
      <div
        ref={viewportRef}
        className="max-h-[72vh] overflow-auto overscroll-contain rounded-lg border bg-muted p-3 sm:p-5"
      >
        <div className={layout === 'double' ? 'mx-auto max-w-[92rem]' : 'mx-auto max-w-[62rem]'}>
          <div
            className={layout === 'double' ? 'grid grid-cols-1 gap-4 lg:grid-cols-2' : 'space-y-5'}
            style={{ zoom: zoom / 100 }}
          >
            {Array.from({ length: Math.min(visiblePages, pageCount) }, (_, index) => (
              <PdfPageImage key={`${sourceId}-${index + 1}`} sourceId={sourceId} page={index + 1} filename={filename} />
            ))}
          </div>
        </div>
        {visiblePages < pageCount && (
          <button
            type="button"
            onClick={() => setVisiblePages(pages => Math.min(pages + (layout === 'double' ? 4 : 3), pageCount))}
            className="mx-auto mt-5 block rounded-lg border bg-card px-4 py-2.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-accent"
          >
            {t('sources.loadMorePages', { count: layout === 'double' ? 4 : 3 })}
          </button>
        )}
      </div>
    </div>
  )
}

function DocxSourceViewer({ sourceId, filename }: { sourceId: string; filename: string }) {
  const { t } = useTranslation()
  const renderTargetRef = useRef<HTMLDivElement>(null)
  const { viewportRef, zoom, setZoom } = useDocumentZoom()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    const renderTarget = renderTargetRef.current
    if (!renderTarget) return

    renderTarget.replaceChildren()
    setLoading(true)
    setError(false)

    Promise.all([
      sourcesApi.downloadFile(sourceId),
      import('docx-preview'),
    ])
      .then(async ([response, docxPreview]) => {
        if (cancelled) return
        await docxPreview.renderAsync(response.data, renderTarget, renderTarget, {
          breakPages: true,
          experimental: true,
          ignoreFonts: false,
          ignoreHeight: false,
          ignoreWidth: false,
          inWrapper: true,
          renderEndnotes: true,
          renderFooters: true,
          renderFootnotes: true,
          renderHeaders: true,
          useBase64URL: true,
        })
      })
      .catch(err => {
        console.error('Failed to render DOCX preview:', err)
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      renderTarget.replaceChildren()
    }
  }, [sourceId])

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-1.5 rounded-md border bg-card px-2 py-1.5">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <span className="rounded-sm border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">DOCX</span>
          <span className="hidden max-w-72 truncate text-[11px] font-medium text-muted-foreground sm:inline">{filename}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-[11px] text-muted-foreground md:inline">{t('sources.')}</span>
          <DocumentZoomControls
            zoom={zoom}
            onZoomChange={setZoom}
            labels={{ group: t('sources.documentZoom'), out: t('sources.zoomOut'), in: t('sources.zoomIn'), reset: t('sources.resetZoom') }}
          />
        </div>
      </div>
      <div
        ref={viewportRef}
        className="relative min-h-[24rem] max-h-[72vh] overflow-auto overscroll-contain rounded-lg border bg-muted p-3 sm:p-5"
      >
        {loading && (
          <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm">
            <DocumentLoadingSkeleton label={t('sources.docxLoading')} />
          </div>
        )}
        {error ? (
          <div className="flex min-h-[20rem] items-center justify-center px-6 text-center text-sm text-muted-foreground">
            {t('sources.docxPreviewError')}
          </div>
        ) : (
          <div
            ref={renderTargetRef}
            className="mx-auto w-fit min-w-full [&_.docx-wrapper]:!bg-transparent [&_.docx-wrapper]:!p-0 [&_section.docx]:!mb-5 [&_section.docx]:!shadow-md"
            style={{ zoom: zoom / 100 }}
          />
        )}
      </div>
    </div>
  )
}

function PdfPageImage({ sourceId, page, filename }: { sourceId: string; page: number; filename: string }) {
  const { t } = useTranslation()
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null

    sourcesApi.renderPdfPage(sourceId, page)
      .then(response => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(response.data)
        setImageUrl(objectUrl)
      })
      .catch(() => { if (!cancelled) setError(true) })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [sourceId, page])

  return (
    <figure className="overflow-hidden rounded-lg border bg-white dark:bg-slate-900">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img loading="lazy" src={imageUrl} alt={`${filename} — trang ${page}`} className="mx-auto h-auto w-full" />
      ) : (
        <div className="flex min-h-40 items-center justify-center text-xs text-muted-foreground">
          {error ? 'Không thể tải trang này' : <LoadingSpinner className="h-5 w-5 text-teal" />}
        </div>
      )}
      <figcaption className="border-t bg-muted/30 px-3 py-1.5 text-center text-[11px] text-muted-foreground">
        {t('sources.pageNumber', { page })}
      </figcaption>
    </figure>
  )
}

function MediaSourceViewer({ sourceId, filename, type }: { sourceId: string; filename: string; type: 'audio' | 'video' }) {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null
    setLoading(true)
    setError(false)

    sourcesApi.downloadFile(sourceId)
      .then(response => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(response.data)
        setMediaUrl(objectUrl)
      })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [sourceId])

  if (loading) return <div className="flex min-h-32 items-center justify-center rounded-lg border bg-muted/20"><LoadingSpinner className="h-6 w-6 text-muted-foreground" /></div>
  if (error || !mediaUrl) return <div className="rounded-lg border border-dashed bg-muted/10 p-6 text-center text-sm text-muted-foreground">Không thể phát file này. Bạn có thể dùng nút tải xuống ở phía trên.</div>

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <p className="truncate text-sm font-medium text-foreground">{filename}</p>
      {type === 'video' ? (
        <video controls preload="metadata" src={mediaUrl} className="max-h-[65vh] w-full rounded-xl bg-black" />
      ) : (
        <audio controls preload="metadata" src={mediaUrl} className="w-full" />
      )}
    </div>
  )
}

interface SourceDetailContentProps {
  sourceId: string
  showChatButton?: boolean
  onChatClick?: () => void
  onClose?: () => void
  /** Fill a parent with an explicit height, such as the source dialog. */
  fillHeight?: boolean
}

const safeExternalHref = (url: string | null | undefined): string | null => {
  if (!url) return null

  try {
    const parsedUrl = new URL(url)
    return ['http:', 'https:'].includes(parsedUrl.protocol) ? parsedUrl.href : null
  } catch {
    return null
  }
}

export function SourceDetailContent(props: SourceDetailContentProps) {
  // Remount per source so all per-source UI state (active tab, transient
  // flags, insight selection…) resets on navigation, without parents needing
  // to key the component. The source data itself is cached by React Query, so
  // remounting is cheap: a cached source renders immediately.
  return <SourceDetailContentInner key={props.sourceId} {...props} />
}

function SourceDetailContentInner({
  sourceId,
  showChatButton = false,
  onChatClick,
  onClose,
  fillHeight = false
}: SourceDetailContentProps) {
  const { t, language } = useTranslation()
  const queryClient = useQueryClient()
  const [insights, setInsights] = useState<SourceInsightResponse[]>([])
  const [transformations, setTransformations] = useState<Transformation[]>([])
  const [selectedTransformation, setSelectedTransformation] = useState<string>('')
  const [loadingInsights, setLoadingInsights] = useState(false)
  const [creatingInsight, setCreatingInsight] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isEmbedding, setIsEmbedding] = useState(false)
  const [isDownloadingFile, setIsDownloadingFile] = useState(false)
  const [fileAvailable, setFileAvailable] = useState<boolean | null>(null)
  const [selectedInsight, setSelectedInsight] = useState<SourceInsightResponse | null>(null)
  const [insightToDelete, setInsightToDelete] = useState<string | null>(null)
  const [deletingInsight, setDeletingInsight] = useState(false)

  // A 404 means the source was deleted (e.g. a dangling chat/ask reference) —
  // handled by the shared "content no longer exists" state. The global query
  // client never retries 404s, so the not-found state shows immediately.
  const { data: source, isPending, error: loadQueryError, refetch: refetchSource } = useSource(sourceId)
  const loadError = loadQueryError ? (isNotFoundError(loadQueryError) ? 'not-found' : 'error') : null
  const updateSource = useUpdateSource()
  const deleteSource = useDeleteSource()

  // file_available comes from the source payload; downloads may flip it later,
  // so keep it as local state synced from the query data.
  useEffect(() => {
    setFileAvailable(typeof source?.file_available === 'boolean' ? source.file_available : null)
  }, [source?.file_available])

  const fetchInsights = useCallback(async () => {
    try {
      setLoadingInsights(true)
      const data = await insightsApi.listForSource(sourceId)
      setInsights(data)
    } catch (err) {
      console.error('Failed to fetch insights:', err)
    } finally {
      setLoadingInsights(false)
    }
  }, [sourceId])

  const fetchTransformations = useCallback(async () => {
    try {
      const data = await transformationsApi.list()
      setTransformations(data)
    } catch (err) {
      console.error('Failed to fetch transformations:', err)
    }
  }, [])

  useEffect(() => {
    if (sourceId) {
      void fetchInsights()
      void fetchTransformations()
    }
  }, [fetchInsights, fetchTransformations, sourceId])

  const createInsight = async () => {
    if (!selectedTransformation) {
      toast.error(t('sources.selectTransformation'))
      return
    }

    try {
      setCreatingInsight(true)
      const response = await insightsApi.create(sourceId, {
        transformation_id: selectedTransformation
      })
      // Show toast for async operation
      toast.success(t('sources.insightGenerationStarted'))
      setSelectedTransformation('')

      // Poll for command completion if we have a command_id
      if (response.command_id) {
        // Poll in background (don't block UI)
        insightsApi.waitForCommand(response.command_id, {
          maxAttempts: 120, // Up to 4 minutes (120 * 2s)
          intervalMs: 2000
        }).then(success => {
          if (success) {
            void fetchInsights()
            // Invalidate sources queries so notebook page refreshes with updated insights_count
            queryClient.invalidateQueries({ queryKey: ['sources'] })
          }
        }).catch(err => {
          console.error('Error waiting for insight command:', err)
        })
      } else {
        // Fallback: refresh after delay if no command_id
        setTimeout(() => {
          void fetchInsights()
          // Also invalidate sources queries
          queryClient.invalidateQueries({ queryKey: ['sources'] })
        }, 5000)
      }
    } catch (err) {
      console.error('Failed to create insight:', err)
      toast.error(t('common.error'))
    } finally {
      setCreatingInsight(false)
    }
  }

  const handleDeleteInsight = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    if (!insightToDelete) return

    try {
      setDeletingInsight(true)
      await insightsApi.delete(insightToDelete)
      toast.success(t('common.success'))
      setInsightToDelete(null)
      await fetchInsights()
    } catch (err) {
      console.error('Failed to delete insight:', err)
      toast.error(t('common.error'))
    } finally {
      setDeletingInsight(false)
    }
  }

  const handleUpdateTitle = async (title: string) => {
    if (!source || title === source.title) return

    try {
      await updateSource.mutateAsync({ id: sourceId, data: { title } })
      // The mutation invalidates the source queries (list + detail); patch the
      // detail cache immediately so the title doesn't flash back while the
      // refetch is in flight.
      queryClient.setQueryData<SourceDetailResponse>(
        QUERY_KEYS.source(sourceId),
        (previous) => (previous ? { ...previous, title } : previous)
      )
    } catch (err) {
      // The mutation hook already shows an error toast.
      console.error('Failed to update source title:', err)
      await refetchSource()
    }
  }

  const handleEmbedContent = async () => {
    if (!source) return

    try {
      setIsEmbedding(true)
      const response = await embeddingApi.embedContent(sourceId, 'source')
      toast.success(response.message || t('common.success'))
      await refetchSource()
    } catch (err) {
      console.error('Failed to embed content:', err)
      toast.error(t('common.error'))
    } finally {
      setIsEmbedding(false)
    }
  }

  const extractFilename = (pathOrUrl: string | undefined, fallback: string) => {
    if (!pathOrUrl) {
      return fallback
    }
    const segments = pathOrUrl.split(/[/\\]/)
    return segments.pop() || fallback
  }

  const parseContentDisposition = (header?: string | null) => {
    if (!header) {
      return null
    }
    const match = header.match(/filename\*?=([^;]+)/i)
    if (!match) {
      return null
    }
    const value = match[1].trim()
    if (value.toLowerCase().startsWith("utf-8''")) {
      return decodeURIComponent(value.slice(7))
    }
    return value.replace(/^["']|["']$/g, '')
  }

  const handleDownloadFile = async () => {
    if (!source?.asset?.file_path || isDownloadingFile || fileAvailable === false) {
      return
    }

    try {
      setIsDownloadingFile(true)
      const response = await sourcesApi.downloadFile(source.id)
      const filenameFromHeader = parseContentDisposition(
        response.headers?.['content-disposition'] as string | undefined
      )
      const fallbackName = extractFilename(source.asset.file_path, `source-${source.id}`)
      const filename = filenameFromHeader || fallbackName

      const blobUrl = window.URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
      setFileAvailable(true)
      toast.success(t('common.success'))
    } catch (err) {
      console.error('Failed to download file:', err)
      if (isNotFoundError(err)) {
        setFileAvailable(false)
        toast.error(t('sources.fileUnavailable'))
      } else {
        toast.error(t('common.error'))
      }
    } finally {
      setIsDownloadingFile(false)
    }
  }

  const getSourceIcon = () => {
    if (!source) return null
    if (source.asset?.url) return <IconLink className="h-5 w-5" />
    if (source.asset?.file_path) return <IconUpload className="h-5 w-5" />
    return <IconAlignLeft className="h-5 w-5" />
  }

  const getSourceType = () => {
    if (!source) return 'unknown'
    if (source.asset?.url) return 'link'
    if (source.asset?.file_path) return 'file'
    return 'text'
  }

  const externalHref = useMemo(() => safeExternalHref(source?.asset?.url), [source?.asset?.url])

  const handleCopyUrl = useCallback(() => {
    if (source?.asset?.url) {
      navigator.clipboard.writeText(source.asset.url)
      setCopied(true)
      toast.success(t('sources.urlCopied'))
      setTimeout(() => setCopied(false), 2000)
    }
  }, [source, t])

  const handleOpenExternal = useCallback(() => {
    if (externalHref) {
      window.open(externalHref, '_blank', 'noopener,noreferrer')
    }
  }, [externalHref])

  const getYouTubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  const isYouTubeUrl = useMemo(() => {
    if (!externalHref) return false
    return !!(getYouTubeVideoId(externalHref))
  }, [externalHref])

  const youTubeVideoId = useMemo(() => {
    if (!externalHref) return null
    return getYouTubeVideoId(externalHref)
  }, [externalHref])

  const handleDelete = async () => {
    if (!source) return

    if (confirm(t('sources.deleteSourceConfirm') || t('common.confirm'))) {
      try {
        // The mutation hook shows the toasts and invalidates the source
        // queries, so a reopened dialog can't serve the deleted source from
        // the cache.
        await deleteSource.mutateAsync(source.id)
        onClose?.()
      } catch (error) {
        console.error('Failed to delete source:', error)
      }
    }
  }

  if (isPending) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
        <div className="shrink-0 border-b bg-card px-5 py-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="h-8 w-64 max-w-[55%] animate-pulse rounded-lg bg-muted" />
            <div className="flex gap-2">
              <div className="h-7 w-20 animate-pulse rounded-md bg-muted" />
              <div className="h-7 w-8 animate-pulse rounded-md bg-muted" />
            </div>
          </div>
          <div className="h-5 w-2/5 animate-pulse rounded bg-muted" />
          <div className="mt-1.5 h-2.5 w-48 animate-pulse rounded bg-muted" />
        </div>
        <div className="min-h-0 flex-1 p-4 sm:p-5">
          <DocumentLoadingSkeleton label={t('common.loading')} />
        </div>
      </div>
    )
  }

  // A definitive 404 always wins, even when React Query still holds stale
  // data from before the source was deleted (retained data on a failed
  // refetch). A transient refetch error over good cached data does not
  // replace the rendered source.
  if (loadError === 'not-found' || !source) {
    return (
      <ContentUnavailable
        variant={loadError ?? 'error'}
        onClose={onClose}
      />
    )
  }

  return (
    <div className={fillHeight
      ? 'flex h-full min-h-0 flex-col overflow-hidden bg-background'
      : 'flex min-h-full flex-col bg-background'}>
      <Tabs defaultValue="content" className={fillHeight ? 'flex h-full min-h-0 w-full flex-col' : 'flex w-full flex-col'}>
        {/* Compact management header: navigation and actions stay above the title. */}
        <div className="shrink-0 border-b bg-card/95 px-4 py-3 pr-14 backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:px-5">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <TabsList className="h-8 w-fit rounded-lg bg-muted/70 p-0.5">
              <TabsTrigger value="content" className="h-7 rounded-md px-3 text-xs">{t('sources.content')}</TabsTrigger>
              <TabsTrigger value="insights" className="h-7 rounded-md px-3 text-xs">
                {t('common.insights')} {insights.length > 0 && `(${insights.length})`}
              </TabsTrigger>
              <TabsTrigger value="details" className="h-7 rounded-md px-3 text-xs">{t('sources.details')}</TabsTrigger>
            </TabsList>

            <div className="flex shrink-0 flex-wrap items-center gap-1">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                {getSourceIcon()}
              </span>
              <Badge variant="secondary" className="h-7 rounded-md px-2 text-[11px]">
                {getSourceType()}
              </Badge>

              {showChatButton && onChatClick && (
                <Button variant="outline" size="sm" className="h-7 rounded-md px-2.5 text-xs" onClick={onChatClick}>
                  <IconMessage className="mr-1.5 h-3.5 w-3.5" />
                  {t('chat.chatWith', { name: t('navigation.sources') })}
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md">
                    <IconDotsVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {source.asset?.file_path && (
                    <>
                      <DropdownMenuItem
                        onClick={handleDownloadFile}
                        disabled={isDownloadingFile || fileAvailable === false}
                      >
                        <IconDownload className="mr-2 h-4 w-4" />
                        {fileAvailable === false
                          ? t('sources.fileUnavailable')
                          : isDownloadingFile
                            ? t('sources.preparing')
                            : t('sources.downloadFile')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={handleEmbedContent} disabled={isEmbedding || source.embedded}>
                    <IconDatabase className="mr-2 h-4 w-4" />
                    {isEmbedding ? t('sources.embedding') : source.embedded ? t('sources.alreadyEmbedded') : t('sources.embedContent')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
                    <IconTrash className="mr-2 h-4 w-4" />
                    {t('sources.deleteSource')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="mt-2 min-w-0">
            <InlineEdit
              value={source.title || ''}
              onSave={handleUpdateTitle}
              className="block truncate text-lg font-bold tracking-tight sm:text-xl"
              inputClassName="w-full text-lg font-bold tracking-tight sm:text-xl"
              placeholder={t('sources.titlePlaceholder')}
              emptyText={t('sources.untitledSource')}
            />
            <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
              {t('sources.id')}: {source.id}
            </p>
          </div>
        </div>

        <TabsContent value="content" className={fillHeight ? 'mt-0 min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5' : 'mt-0 px-4 py-3 sm:px-5'}>
          <section>
            {externalHref && !isYouTubeUrl && (
              <p className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
                <IconLink className="h-3.5 w-3.5 shrink-0" />
                <a
                  href={externalHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate font-mono hover:underline"
                >
                  {source.asset?.url}
                </a>
              </p>
            )}
            {isYouTubeUrl && youTubeVideoId && (
              <div className="mb-6">
                <div className="aspect-video rounded-md overflow-hidden bg-black">
                  <iframe
                    src={`https://www.youtube.com/embed/${youTubeVideoId}`}
                    title={t('common.accessibility.ytVideo')}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                {externalHref && (
                  <div className="mt-2">
                    <a
                      href={externalHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1"
                    >
                      <IconExternalLink className="h-3 w-3" />
                      {t('sources.openOnYoutube')}
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Image file: show visual viewer instead of extracted text */}
            {isImageSource(source.asset?.file_path) ? (
              <ImageSourceViewer
                sourceId={source.id}
                filename={getFilenameFromPath(source.asset?.file_path)}
              />
            ) : isPdfSource(source.asset?.file_path) ? (
              <PdfSourceViewer
                sourceId={source.id}
                filename={getFilenameFromPath(source.asset?.file_path)}
              />
            ) : isDocxSource(source.asset?.file_path) ? (
              <DocxSourceViewer
                sourceId={source.id}
                filename={getFilenameFromPath(source.asset?.file_path)}
              />
            ) : getMediaType(source.asset?.file_path) ? (
              <MediaSourceViewer
                sourceId={source.id}
                filename={getFilenameFromPath(source.asset?.file_path)}
                type={getMediaType(source.asset?.file_path) as 'audio' | 'video'}
              />
            ) : (
              <div className="rounded-2xl border bg-card/60 px-5 py-4 shadow-sm sm:px-6">
                <MarkdownRenderer>
                  {source.full_text || t('sources.noContent')}
                </MarkdownRenderer>
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent value="insights" className={fillHeight ? 'mt-0 min-h-0 flex-1 overflow-y-auto px-5 py-5' : 'mt-0 px-5 py-5'}>
          <section>
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-[15.5px] font-medium">
                <IconBulb className="h-4 w-4 text-teal" />
                {t('common.insights')}
                <span className="font-mono text-xs text-muted-foreground">{insights.length}</span>
              </h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('sources.insightsDesc')}
            </p>

            {/* Create New Insight */}
            <div className="mt-6 mb-8 flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border bg-card shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground shrink-0">
                <IconSparkles className="h-4 w-4 text-teal" />
                {t('sources.generateNewInsight')}
              </div>
              <Select
                name="transformation"
                value={selectedTransformation}
                onValueChange={setSelectedTransformation}
                disabled={creatingInsight}
              >
                <SelectTrigger id="transformation-select" className="w-full sm:max-w-[300px] bg-background">
                  <SelectValue placeholder={t('sources.selectTransformation')} />
                </SelectTrigger>
                <SelectContent>
                  {transformations.map((trans) => (
                    <SelectItem key={trans.id} value={trans.id}>
                      {trans.title || trans.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="w-full sm:w-auto shadow-sm"
                onClick={createInsight}
                disabled={!selectedTransformation || creatingInsight}
              >
                {creatingInsight ? (
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                ) : (
                  <IconPlus className="mr-2 h-4 w-4" />
                )}
                {t('common.create')}
              </Button>
            </div>

            {/* Insights List */}
            {loadingInsights ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner className="h-6 w-6 text-teal" />
              </div>
            ) : insights.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-xl border border-dashed bg-muted/10 text-muted-foreground shadow-sm">
                <IconBulb className="h-10 w-10 mx-auto mb-3 opacity-30 text-teal" />
                <p className="text-sm font-medium text-foreground/80">{t('sources.noInsightsYet')}</p>
                <p className="text-xs mt-1 opacity-80">{t('sources.createFirstInsight')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {insights.map((insight) => (
                  <div
                    key={insight.id}
                    className="group flex flex-col sm:flex-row gap-4 p-4 rounded-xl border bg-card shadow-sm hover:shadow-md hover:border-teal/40 transition-all cursor-pointer hover:-translate-y-0.5"
                    onClick={() => setSelectedInsight(insight)}
                  >
                    <div className="shrink-0 pt-0.5">
                      <Badge variant="secondary" className="bg-teal/10 text-teal border-0 font-medium tracking-wide text-[11px] px-2 py-0.5">
                        {insight.insight_type}
                      </Badge>
                    </div>
                    <p className="flex-1 text-[14px] text-foreground/90 leading-relaxed line-clamp-3">
                      {insight.content}
                    </p>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInsightToDelete(insight.id);
                      }}
                      className="shrink-0 h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive hover:bg-destructive/10"
                      title={t('sources.deleteInsight')}
                    >
                      <IconTrash className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent value="details" className={fillHeight ? 'mt-0 min-h-0 flex-1 overflow-y-auto px-5 py-5' : 'mt-0 px-5 py-5'}>
          <section className="space-y-5">
            <h3 className="text-[15.5px] font-medium">{t('sources.details')}</h3>
            <div className="space-y-5">
              {/* Embedding Alert */}
              {!source.embedded && (
                <Alert>
                  <IconAlertCircle className="h-4 w-4" />
                  <AlertTitle>
                    {t('sources.notEmbeddedAlert')}
                  </AlertTitle>
                  <AlertDescription>
                    {t('sources.notEmbeddedDesc')}
                    <div className="mt-3">
                      <Button
                        onClick={handleEmbedContent}
                        disabled={isEmbedding}
                        size="sm"
                      >
                        <IconDatabase className="mr-2 h-4 w-4" />
                        {isEmbedding ? t('sources.embedding') : t('sources.embedContent')}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Source Information */}
              <div className="space-y-4">
                {source.asset?.url && (
                  <div>
                    <h3 className="mb-2 text-sm font-medium">{t('common.url')}</h3>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded bg-muted px-2 py-1 text-sm">
                        {source.asset.url}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopyUrl}
                      >
                        {copied ? (
                          <IconCircleCheck className="h-4 w-4" />
                        ) : (
                          <IconCopy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleOpenExternal}
                        disabled={!externalHref}
                      >
                        <IconExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {source.asset?.file_path && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">{t('sources.uploadedFile')}</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded bg-muted px-2 py-1 text-sm">
                        {source.asset.file_path}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDownloadFile}
                        disabled={isDownloadingFile || fileAvailable === false}
                      >
                        <IconDownload className="mr-2 h-4 w-4" />
                        {fileAvailable === false
                          ? t('sources.fileUnavailable')
                          : isDownloadingFile
                            ? t('sources.preparing')
                            : t('common.download')}
                      </Button>
                    </div>
                    {fileAvailable === false ? (
                      <p className="text-xs text-muted-foreground">
                        {t('sources.fileUnavailableDesc')}
                      </p>
                    ) : null}
                  </div>
                )}

                {source.topics && source.topics.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-medium">{t('sources.topics')}</h3>
                    <div className="flex flex-wrap gap-2">
                      {source.topics.map((topic, idx) => (
                        <Badge key={idx} variant="outline">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="border-t border-border pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">{t('sources.metadata')}</h3>
                  <div className="flex items-center gap-2">
                    <IconDatabase className="h-3.5 w-3.5 text-muted-foreground" />
                    <Badge variant={source.embedded ? "default" : "secondary"} className="text-xs">
                      {source.embedded ? t('sources.embedded') : t('sources.notEmbedded')}
                    </Badge>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{t('common.created_label')}</p>
                    <p className="text-sm">
                      {formatDistanceToNow(new Date(source.created), {
                        addSuffix: true,
                        locale: getDateLocale(language)
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(source.created).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{t('common.updated_label')}</p>
                    <p className="text-sm">
                      {formatDistanceToNow(new Date(source.updated), {
                        addSuffix: true,
                        locale: getDateLocale(language)
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(source.updated).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Notebook Associations */}
          <NotebookAssociations
            sourceId={sourceId}
            currentNotebookIds={source.notebooks || []}
            onSave={() => void refetchSource()}
          />
        </TabsContent>
      </Tabs>

      <SourceInsightDialog
        open={Boolean(selectedInsight)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedInsight(null)
          }
        }}
        insight={selectedInsight ?? undefined}
        onDelete={async (insightId) => {
          try {
            await insightsApi.delete(insightId)
            toast.success(t('common.success'))
            setSelectedInsight(null)
            await fetchInsights()
          } catch (err) {
            console.error('Failed to delete insight:', err)
            toast.error(t('common.error'))
          }
        }}
      />

      <AlertDialog open={!!insightToDelete} onOpenChange={() => setInsightToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('sources.deleteInsight')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('sources.deleteInsightConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingInsight}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                onClick={handleDeleteInsight}
                disabled={deletingInsight}
                variant="destructive"
              >
                {deletingInsight ? t('common.deleting') : t('common.delete')}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

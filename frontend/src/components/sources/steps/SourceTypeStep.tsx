"use client"

import { useMemo, useState, useRef, useCallback, useEffect } from "react"
import { Control, FieldErrors, UseFormRegister, UseFormSetValue, useWatch } from "react-hook-form"
import { IconAlertCircle, IconCircleCheck, IconCloudUpload, IconFile, IconFileSpreadsheet, IconFileText, IconFileZip, IconInfoCircle, IconLink, IconMusic, IconPhoto, IconPlus, IconPresentation, IconVideo, IconX } from '@tabler/icons-react'
import { useTranslation } from "@/lib/hooks/use-translation"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Controller } from "react-hook-form"
import { cn } from "@/lib/utils"

// ─── File type icon + color registry ───────────────────────────────────────
type FileTypeInfo = {
  icon: React.ElementType
  label: string
  bg: string
  text: string
  ext: string
}

function getFileTypeInfo(filename: string): FileTypeInfo {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, FileTypeInfo> = {
    pdf:  { icon: IconFileText,       label: 'PDF',   bg: 'bg-red-100 dark:bg-red-900/30',     text: 'text-red-600 dark:text-red-400',     ext: 'PDF'  },
    doc:  { icon: IconFileText,       label: 'DOC',   bg: 'bg-blue-100 dark:bg-blue-900/30',    text: 'text-blue-600 dark:text-blue-400',    ext: 'DOC'  },
    docx: { icon: IconFileText,       label: 'DOCX',  bg: 'bg-blue-100 dark:bg-blue-900/30',    text: 'text-blue-600 dark:text-blue-400',    ext: 'DOCX' },
    xls:  { icon: IconFileSpreadsheet, label: 'XLS',  bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', ext: 'XLS' },
    xlsx: { icon: IconFileSpreadsheet, label: 'XLSX', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', ext: 'XLSX' },
    ppt:  { icon: IconPresentation,   label: 'PPT',   bg: 'bg-orange-100 dark:bg-orange-900/30',  text: 'text-orange-600 dark:text-orange-400',  ext: 'PPT'  },
    pptx: { icon: IconPresentation,   label: 'PPTX',  bg: 'bg-orange-100 dark:bg-orange-900/30',  text: 'text-orange-600 dark:text-orange-400',  ext: 'PPTX' },
    txt:  { icon: IconFileText,       label: 'TXT',   bg: 'bg-slate-100 dark:bg-slate-800',       text: 'text-slate-600 dark:text-slate-400',    ext: 'TXT'  },
    md:   { icon: IconFileText,       label: 'MD',    bg: 'bg-slate-100 dark:bg-slate-800',       text: 'text-slate-600 dark:text-slate-400',    ext: 'MD'   },
    epub: { icon: IconFileText,       label: 'EPUB',  bg: 'bg-violet-100 dark:bg-violet-900/30',  text: 'text-violet-600 dark:text-violet-400',  ext: 'EPUB' },
    html: { icon: IconFileText,       label: 'HTML',  bg: 'bg-yellow-100 dark:bg-yellow-900/30',  text: 'text-yellow-600 dark:text-yellow-500',  ext: 'HTML' },
    mp4:  { icon: IconVideo,      label: 'MP4',   bg: 'bg-purple-100 dark:bg-purple-900/30',  text: 'text-purple-600 dark:text-purple-400',  ext: 'MP4'  },
    avi:  { icon: IconVideo,      label: 'AVI',   bg: 'bg-purple-100 dark:bg-purple-900/30',  text: 'text-purple-600 dark:text-purple-400',  ext: 'AVI'  },
    mov:  { icon: IconVideo,      label: 'MOV',   bg: 'bg-purple-100 dark:bg-purple-900/30',  text: 'text-purple-600 dark:text-purple-400',  ext: 'MOV'  },
    wmv:  { icon: IconVideo,      label: 'WMV',   bg: 'bg-purple-100 dark:bg-purple-900/30',  text: 'text-purple-600 dark:text-purple-400',  ext: 'WMV'  },
    mp3:  { icon: IconMusic,      label: 'MP3',   bg: 'bg-pink-100 dark:bg-pink-900/30',      text: 'text-pink-600 dark:text-pink-400',      ext: 'MP3'  },
    wav:  { icon: IconMusic,      label: 'WAV',   bg: 'bg-pink-100 dark:bg-pink-900/30',      text: 'text-pink-600 dark:text-pink-400',      ext: 'WAV'  },
    m4a:  { icon: IconMusic,      label: 'M4A',   bg: 'bg-pink-100 dark:bg-pink-900/30',      text: 'text-pink-600 dark:text-pink-400',      ext: 'M4A'  },
    aac:  { icon: IconMusic,      label: 'AAC',   bg: 'bg-pink-100 dark:bg-pink-900/30',      text: 'text-pink-600 dark:text-pink-400',      ext: 'AAC'  },
    jpg:  { icon: IconPhoto,      label: 'JPG',   bg: 'bg-amber-100 dark:bg-amber-900/30',    text: 'text-amber-600 dark:text-amber-400',    ext: 'JPG'  },
    jpeg: { icon: IconPhoto,      label: 'JPEG',  bg: 'bg-amber-100 dark:bg-amber-900/30',    text: 'text-amber-600 dark:text-amber-400',    ext: 'JPEG' },
    png:  { icon: IconPhoto,      label: 'PNG',   bg: 'bg-amber-100 dark:bg-amber-900/30',    text: 'text-amber-600 dark:text-amber-400',    ext: 'PNG'  },
    tiff: { icon: IconPhoto,      label: 'TIFF',  bg: 'bg-amber-100 dark:bg-amber-900/30',    text: 'text-amber-600 dark:text-amber-400',    ext: 'TIFF' },
    zip:  { icon: IconFileZip,    label: 'ZIP',   bg: 'bg-gray-100 dark:bg-gray-800',         text: 'text-gray-600 dark:text-gray-400',      ext: 'ZIP'  },
    tar:  { icon: IconFileZip,    label: 'TAR',   bg: 'bg-gray-100 dark:bg-gray-800',         text: 'text-gray-600 dark:text-gray-400',      ext: 'TAR'  },
    gz:   { icon: IconFileZip,    label: 'GZ',    bg: 'bg-gray-100 dark:bg-gray-800',         text: 'text-gray-600 dark:text-gray-400',      ext: 'GZ'   },
  }
  return map[ext] ?? { icon: IconFile, label: ext.toUpperCase() || 'FILE', bg: 'bg-muted', text: 'text-muted-foreground', ext: ext.toUpperCase() }
}

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'bmp', 'svg'])
const VIDEO_EXTS = new Set(['mp4', 'mov', 'avi', 'wmv', 'mkv', 'webm'])

function isImageFile(name: string) {
  return IMAGE_EXTS.has(name.split('.').pop()?.toLowerCase() ?? '')
}
function isVideoFile(name: string) {
  return VIDEO_EXTS.has(name.split('.').pop()?.toLowerCase() ?? '')
}

// ─── Thumbnail preview component ─────────────────────────────────────────────
function FilePreviewThumbnail({ file }: { file: File }) {
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [videoThumb, setVideoThumb] = useState<string | null>(null)
  const info = getFileTypeInfo(file.name)
  const Icon = info.icon

  // Image preview
  useEffect(() => {
    if (!isImageFile(file.name)) return
    const url = URL.createObjectURL(file)
    setImgSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Video thumbnail via canvas
  useEffect(() => {
    if (!isVideoFile(file.name)) return
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.src = url
    video.muted = true
    video.currentTime = 1
    video.onloadeddata = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 80
      canvas.height = 56
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0, 80, 56)
        setVideoThumb(canvas.toDataURL('image/jpeg', 0.7))
      }
      URL.revokeObjectURL(url)
    }
    video.onerror = () => URL.revokeObjectURL(url)
    video.load()
  }, [file])

  // Image files → show real thumbnail
  if (isImageFile(file.name) && imgSrc) {
    return (
      <div className="relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 border-border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={file.name}
          className="w-full h-full object-cover"
        />
        <span className="absolute bottom-0 right-0 text-[8px] font-bold bg-black/60 text-white px-1 py-0.5 rounded-tl-md leading-none">
          {info.ext}
        </span>
      </div>
    )
  }

  // Video files → show video thumbnail if captured, else icon
  if (isVideoFile(file.name) && videoThumb) {
    return (
      <div className="relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 border-border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={videoThumb} alt={file.name} className="w-full h-full object-cover" />
        {/* Play icon overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
            <svg className="w-3 h-3 text-white fill-white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
        <span className="absolute bottom-0 right-0 text-[8px] font-bold bg-black/60 text-white px-1 py-0.5 rounded-tl-md leading-none">
          {info.ext}
        </span>
      </div>
    )
  }

  // All other file types → colored icon badge
  return (
    <div className={cn(
      "flex-shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-xl gap-1",
      info.bg
    )}>
      <Icon className={cn("h-5 w-5", info.text)} />
      <span className={cn("text-[9px] font-bold leading-none", info.text)}>{info.ext}</span>
    </div>
  )
}

interface CreateSourceFormData {
  type: 'link' | 'upload' | 'text'
  title?: string
  url?: string
  content?: string
  file?: FileList | File
  notebooks?: string[]
  transformations?: string[]
  embed: boolean
  async_processing: boolean
}

// Helper functions for batch URL parsing
function parseUrls(text: string): string[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
}

function validateUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function parseAndValidateUrls(text: string): {
  valid: string[]
  invalid: { url: string; line: number }[]
} {
  const lines = text.split('\n')
  const valid: string[] = []
  const invalid: { url: string; line: number }[] = []

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    if (trimmed.length === 0) return // skip empty lines

    if (validateUrl(trimmed)) {
      valid.push(trimmed)
    } else {
      invalid.push({ url: trimmed, line: index + 1 })
    }
  })

  return { valid, invalid }
}

import type { TFunction } from 'i18next'

const getSourceTypes = (t: TFunction) => [
  {
    value: 'link' as const,
    label: t('sources.addUrl'),
    icon: IconLink,
    description: 'Thêm từ đường dẫn web',
  },
  {
    value: 'upload' as const,
    label: t('sources.uploadFile'),
    icon: IconFile,
    description: 'PDF, DOCX, MP4, ...',
  },
  {
    value: 'text' as const,
    label: t('sources.enterText'),
    icon: IconFileText,
    description: 'Nhập nội dung trực tiếp',
  },
]

interface SourceTypeStepProps {
  control: Control<CreateSourceFormData>
  register: UseFormRegister<CreateSourceFormData>
  setValue: UseFormSetValue<CreateSourceFormData>
  errors: FieldErrors<CreateSourceFormData>
  urlValidationErrors?: { url: string; line: number }[]
  onClearUrlErrors?: () => void
}

const MAX_BATCH_SIZE = 50

export function SourceTypeStep({ control, register, setValue, errors, urlValidationErrors, onClearUrlErrors }: SourceTypeStepProps) {
  const { t } = useTranslation()
  const selectedType = useWatch({ control, name: 'type' })
  const urlInput = useWatch({ control, name: 'url' })
  const fileInput = useWatch({ control, name: 'file' })

  const [hasHtmlContent, setHasHtmlContent] = useState(false)
  // Local file list state for add/remove support
  const [localFiles, setLocalFiles] = useState<File[]>([])
  const addMoreInputRef = useRef<HTMLInputElement>(null)

  // Sync local file array → react-hook-form FileList via DataTransfer
  const syncFiles = useCallback((files: File[]) => {
    const dt = new DataTransfer()
    files.forEach(f => dt.items.add(f))
    setValue('file', dt.files, { shouldValidate: true })
  }, [setValue])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? [])
    if (!incoming.length) return
    const merged = [...localFiles, ...incoming.filter(
      f => !localFiles.some(ex => ex.name === f.name && ex.size === f.size)
    )]
    setLocalFiles(merged)
    syncFiles(merged)
    e.target.value = '' // reset so same file can be re-added
  }

  const handleRemoveFile = (idx: number) => {
    const updated = localFiles.filter((_, i) => i !== idx)
    setLocalFiles(updated)
    syncFiles(updated)
  }

  const handleClearAll = () => {
    setLocalFiles([])
    setValue('file', undefined, { shouldValidate: true })
  }

  const handleTextPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const htmlContent = event.clipboardData.getData('text/html')
    if (htmlContent) {
      event.preventDefault()
      const textarea = event.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const currentValue = textarea.value
      const newValue = currentValue.substring(0, start) + htmlContent + currentValue.substring(end)
      setValue('content', newValue, { shouldValidate: true })
      setHasHtmlContent(true)
    } else {
      setHasHtmlContent(false)
    }
  }

  const { isBatchMode, itemCount, urlCount, fileCount } = useMemo(() => {
    let urlCount = 0
    let fileCount = 0

    if (selectedType === 'link' && urlInput) {
      const urls = parseUrls(urlInput)
      urlCount = urls.length
    }

    fileCount = localFiles.length

    const isBatchMode = urlCount > 1 || fileCount > 1
    const itemCount = selectedType === 'link' ? urlCount : fileCount

    return { isBatchMode, itemCount, urlCount, fileCount }
  }, [selectedType, urlInput, localFiles])

  const isOverLimit = itemCount > MAX_BATCH_SIZE

  return (
    <div
      className="space-y-4"
      onPaste={(e) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }
        const files = e.clipboardData.files;
        if (files && files.length > 0) {
          e.preventDefault();
          setValue('type', 'upload', { shouldValidate: true });
          const incoming = Array.from(files)
          const merged = [...localFiles, ...incoming.filter(
            f => !localFiles.some(ex => ex.name === f.name && ex.size === f.size)
          )]
          setLocalFiles(merged)
          syncFiles(merged)
          return;
        }
        const text = e.clipboardData.getData('text/plain');
        if (text) {
          e.preventDefault();
          const trimmed = text.trim();
          if (/^(https?:\/\/|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/.test(trimmed) && !trimmed.includes('\n') && !trimmed.includes(' ')) {
            setValue('type', 'link', { shouldValidate: true });
            setValue('url', trimmed, { shouldValidate: true });
          } else {
            setValue('type', 'text', { shouldValidate: true });
            setValue('content', text, { shouldValidate: true });
          }
        }
      }}
      onDrop={(e) => {
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          e.preventDefault();
          setValue('type', 'upload', { shouldValidate: true });
          const incoming = Array.from(e.dataTransfer.files)
          const merged = [...localFiles, ...incoming.filter(
            f => !localFiles.some(ex => ex.name === f.name && ex.size === f.size)
          )]
          setLocalFiles(merged)
          syncFiles(merged)
        }
      }}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* Source Type Selector */}
      <Controller
        control={control}
        name="type"
        render={({ field }) => (
          <div className="grid grid-cols-3 gap-2">
            {getSourceTypes(t).map((type) => {
              const Icon = type.icon
              const isActive = field.value === type.value
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => field.onChange(type.value as 'link' | 'upload' | 'text')}
                  className={cn(
                    "flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all duration-200 cursor-pointer",
                    isActive
                      ? "border-primary bg-primary/8 text-primary shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-primary/4 hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("font-semibold text-[13px]", isActive ? "text-primary" : "text-foreground")}>
                    {type.label}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      />

      {errors.type && (
        <p className="text-sm text-destructive flex items-center gap-1.5 mt-1">
          <IconAlertCircle className="h-4 w-4" />
          {errors.type.message}
        </p>
      )}

      {/* URL Input */}
      {selectedType === 'link' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="url" className="text-sm font-semibold text-foreground">
              {t('sources.urlLabel')} <span className="text-destructive">*</span>
            </Label>
            {urlCount > 0 && (
              <Badge
                variant={isOverLimit ? "destructive" : "secondary"}
                className="rounded-full text-xs px-2.5"
              >
                {t('sources.urlsCount', { count: urlCount })}
                {isOverLimit && ` (tối đa ${MAX_BATCH_SIZE})`}
              </Badge>
            )}
          </div>
          <Textarea
            id="url"
            {...register('url', {
              onChange: () => onClearUrlErrors?.()
            })}
            placeholder={t('sources.enterUrlsPlaceholder')}
            rows={urlCount > 1 ? 5 : 3}
            className="font-mono text-sm resize-none rounded-xl bg-background border-2 border-border focus-visible:ring-0 focus-visible:border-primary p-3.5 shadow-none transition-colors placeholder:text-muted-foreground/60"
          />
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <IconInfoCircle className="h-3.5 w-3.5 flex-shrink-0" />
            {t('sources.batchUrlHint')}
          </p>
          {errors.url && (
            <p className="text-sm text-destructive flex items-center gap-1.5">
              <IconAlertCircle className="h-4 w-4" />
              {errors.url.message}
            </p>
          )}
          {urlValidationErrors && urlValidationErrors.length > 0 && (
            <div className="p-3.5 bg-destructive/8 rounded-xl border-2 border-destructive/20">
              <p className="text-sm font-semibold text-destructive mb-2 flex items-center gap-1.5">
                <IconAlertCircle className="h-4 w-4" />
                {t('sources.invalidUrlsDetected')}
              </p>
              <ul className="space-y-1">
                {urlValidationErrors.map((error, idx) => (
                  <li key={idx} className="text-xs text-destructive flex items-start gap-2">
                    <span className="font-mono bg-destructive/15 px-1.5 py-0.5 rounded-md flex-shrink-0">
                      {t('sources.lineLabel', { line: error.line.toString() })}
                    </span>
                    <span className="truncate">{error.url}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                {t('sources.fixInvalidUrls')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* File Upload */}
      {selectedType === 'upload' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="file" className="text-sm font-semibold text-foreground">
              {t('sources.fileLabel')} <span className="text-destructive">*</span>
            </Label>
            {fileCount > 0 && (
              <Badge
                variant={isOverLimit ? "destructive" : "secondary"}
                className="rounded-full text-xs px-2.5"
              >
                {t('sources.filesCount', { count: fileCount })}
                {isOverLimit && ` (tối đa ${MAX_BATCH_SIZE})`}
              </Badge>
            )}
          </div>
          {/* Drop Zone */}
          <div className={cn(
            "relative flex flex-col items-center justify-center w-full rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer group overflow-hidden",
            fileCount >= 1
              ? "border-primary/40 bg-primary/4 min-h-[80px]"
              : "border-border bg-muted/30 hover:border-primary/50 hover:bg-primary/4 min-h-[150px]"
          )}>
            {/* Hidden primary input */}
            <input
              id="file"
              type="file"
              multiple
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.pptx,.ppt,.xlsx,.xls,.txt,.md,.epub,.mp4,.avi,.mov,.wmv,.mp3,.wav,.m4a,.aac,.jpg,.jpeg,.png,.tiff,.zip,.tar,.gz,.html"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="flex flex-col items-center justify-center pointer-events-none p-5 text-center gap-2.5">
              <div className={cn(
                "flex items-center justify-center w-12 h-12 rounded-2xl border-2 transition-all shadow-sm",
                fileCount >= 1
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-background border-border text-muted-foreground group-hover:border-primary/40 group-hover:text-primary"
              )}>
                {fileCount >= 1
                  ? <IconCircleCheck className="h-5 w-5" />
                  : <IconCloudUpload className="h-5 w-5" />
                }
              </div>
              {fileCount >= 1 ? (
                <div>
                  <span className="text-sm font-semibold text-primary block">{fileCount} tập tin đã chọn</span>
                  <span className="text-xs text-muted-foreground mt-0.5 block">Kéo thả để thêm tệp mới</span>
                </div>
              ) : (
                <div>
                  <span className="text-sm font-semibold text-foreground block">{t('sources.selectMultipleFilesHint')}</span>
                  <span className="text-xs text-muted-foreground mt-0.5 block">Kéo thả vào đây hoặc click để chọn</span>
                  <div className="flex flex-wrap justify-center gap-1 mt-2.5">
                    {['PDF','DOCX','XLSX','PPTX','MP4','MP3','JPG','ZIP'].map(ext => (
                      <span key={ext} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">{ext}</span>
                    ))}
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">+more</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* File List */}
          {fileCount >= 1 && (
            <div className="rounded-xl border-2 border-border bg-card overflow-hidden">
              {/* Header */}
              <div className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <IconCircleCheck className="h-3.5 w-3.5 text-emerald-500" />
                  {t('sources.selectedFiles')}
                  <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-full ml-1">{fileCount} tệp</span>
                </p>
                <div className="flex items-center gap-1.5">
                  {/* Add more files button */}
                  <label
                    htmlFor="file-add-more"
                    className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                  >
                    <IconPlus className="h-3.5 w-3.5" />
                    Thêm tệp
                  </label>
                  <input
                    id="file-add-more"
                    ref={addMoreInputRef}
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.pptx,.ppt,.xlsx,.xls,.txt,.md,.epub,.mp4,.avi,.mov,.wmv,.mp3,.wav,.m4a,.aac,.jpg,.jpeg,.png,.tiff,.zip,.tar,.gz,.html"
                    className="hidden"
                  />
                  {/* Clear all button */}
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="flex items-center gap-1 text-xs font-semibold text-destructive bg-destructive/8 hover:bg-destructive/15 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                  >
                    <IconX className="h-3.5 w-3.5" />
                    Xoá tất cả
                  </button>
                </div>
              </div>
              {/* File rows */}
              <ul className="divide-y divide-border max-h-64 overflow-y-auto">
                {localFiles.map((file, idx) => {
                  const info = getFileTypeInfo(file.name)
                  return (
                    <li key={idx} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group/item">
                      {/* Smart thumbnail: image/video preview or colored icon */}
                      <FilePreviewThumbnail file={file} />
                      {/* File info */}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-foreground truncate block">{file.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md", info.bg, info.text)}>
                            {info.ext}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {file.size >= 1024 * 1024
                              ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                              : `${(file.size / 1024).toFixed(1)} KB`}
                          </span>
                        </div>
                      </div>
                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="flex-shrink-0 opacity-0 group-hover/item:opacity-100 flex items-center justify-center w-7 h-7 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition-all"
                        title="Xoá tệp này"
                      >
                        <IconX className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
          {errors.file && (
            <p className="text-sm text-destructive flex items-center gap-1.5">
              <IconAlertCircle className="h-4 w-4" />
              {errors.file.message}
            </p>
          )}
          {isOverLimit && selectedType === 'upload' && (
            <p className="text-sm text-destructive flex items-center gap-1.5">
              <IconAlertCircle className="h-4 w-4" />
              {t('sources.maxFilesAllowed', { count: MAX_BATCH_SIZE })}
            </p>
          )}
        </div>
      )}

      {/* Text Content */}
      {selectedType === 'text' && (
        <div className="space-y-2">
          <Label htmlFor="content" className="text-sm font-semibold text-foreground">
            {t('sources.textContentLabel')} <span className="text-destructive">*</span>
          </Label>
          {hasHtmlContent && (
            <p className="flex items-center gap-2 text-sm text-teal">
              <span className="h-1.5 w-1.5 rounded-full bg-teal" aria-hidden="true" />
              {t('sources.htmlDetected')}
            </p>
          )}
          <Textarea
            id="content"
            {...register('content')}
            placeholder={t('sources.textPlaceholder')}
            rows={8}
            onPaste={handleTextPaste}
            className="resize-none rounded-xl bg-background border-2 border-border focus-visible:ring-0 focus-visible:border-primary p-3.5 shadow-none transition-colors placeholder:text-muted-foreground/60"
          />
          {errors.content && (
            <p className="text-sm text-destructive flex items-center gap-1.5">
              <IconAlertCircle className="h-4 w-4" />
              {errors.content.message}
            </p>
          )}
        </div>
      )}

      {/* Title Field */}
      {!isBatchMode && selectedType && (
        <div className="space-y-2">
          <div>
            <Label htmlFor="source-title" className="text-sm font-semibold text-foreground">
              {selectedType === 'text'
                ? `${t('common.title')} `
                : `${t('common.title')} `}
              {selectedType === 'text'
                ? <span className="text-destructive">*</span>
                : <span className="text-muted-foreground font-normal">({t('common.optional')})</span>
              }
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedType === 'text' ? t('sources.titleRequired') : t('sources.titleGenerated')}
            </p>
          </div>
          <Input
            id="source-title"
            {...register('title')}
            placeholder={t('sources.titlePlaceholder')}
            autoComplete="off"
            className="rounded-xl border-2 border-border bg-background focus-visible:ring-0 focus-visible:border-primary h-11 px-3.5 shadow-none transition-colors placeholder:text-muted-foreground/60"
          />
          {errors.title && (
            <p className="text-sm text-destructive flex items-center gap-1.5">
              <IconAlertCircle className="h-4 w-4" />
              {errors.title.message}
            </p>
          )}
        </div>
      )}

      {/* Batch Mode Indicator */}
      {isBatchMode && (
        <div className="p-3.5 rounded-xl border-2 border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="default" className="rounded-full text-xs px-2.5">{t('common.batchMode')}</Badge>
            <span className="text-sm font-semibold text-foreground">
              {t('sources.batchCount', { count: itemCount, type: selectedType === 'link' ? t('sources.addUrl') : t('sources.uploadFile') })}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('sources.batchTitlesAuto')} {t('sources.batchCommonSettings')}
          </p>
        </div>
      )}
    </div>
  )
}

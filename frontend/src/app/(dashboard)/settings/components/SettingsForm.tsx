'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { useSettings, useUpdateSettings } from '@/lib/hooks/use-settings'
import { useCapabilities } from '@/lib/hooks/use-capabilities'
import { useEffect, useState } from 'react'
import { IconChevronDown } from '@tabler/icons-react'
import { useTranslation } from '@/lib/hooks/use-translation'
import { normalizeVideoTemplateId, VIDEO_TEMPLATE_CHOICES } from '@/lib/api/videos'

const settingsSchema = z.object({
  default_content_processing_engine_doc: z.enum(['auto', 'docling', 'simple']).optional(),
  default_content_processing_engine_url: z.enum(['auto', 'firecrawl', 'jina', 'crawl4ai', 'simple']).optional(),
  default_embedding_option: z.enum(['ask', 'always', 'never']).optional(),
  auto_delete_files: z.enum(['yes', 'no']).optional(),
  docling_ocr: z.boolean().optional(),
  docling_formulas: z.boolean().optional(),
  docling_vision: z.boolean().optional(),
  default_video_voice: z.string().optional(),
  default_video_aspect_ratio: z.enum(['16:9', '9:16']).optional(),
  default_video_duration: z.string().optional(),
  default_video_style: z.string().optional(),
  default_video_character: z.string().optional(),
})

type SettingsFormData = z.infer<typeof settingsSchema>

export function SettingsForm() {
  const { t } = useTranslation()
  const { data: settings, isLoading, error } = useSettings()
  const { data: capabilities, isError: capabilitiesError } = useCapabilities()
  const updateSettings = useUpdateSettings()
  // Opt-in heavy runtimes are installed on demand at container startup, so an
  // engine is only offered when the backend probe confirms it's actually
  // available. While the probe is still loading, default to available to avoid a
  // flash of disabled controls on a correctly-configured install; but if the
  // probe *fails*, fail closed (treat as unavailable) rather than advertising an
  // engine the backend couldn't verify.
  const doclingAvailable = capabilities?.docling_available ?? !capabilitiesError
  const crawl4aiAvailable = capabilities?.crawl4ai_available ?? !capabilitiesError
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    doc: false,
    url: false,
    embedding: false,
    files: false
  })
  const [hasResetForm, setHasResetForm] = useState(false)
  
  
  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty }
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      default_content_processing_engine_doc: undefined,
      default_content_processing_engine_url: undefined,
      default_embedding_option: undefined,
      auto_delete_files: undefined,
      docling_ocr: undefined,
      docling_formulas: undefined,
      docling_vision: undefined,
      default_video_voice: undefined,
      default_video_aspect_ratio: undefined,
      default_video_duration: undefined,
      default_video_style: undefined,
      default_video_character: undefined,
    }
  })


  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  useEffect(() => {
    if (settings && settings.default_content_processing_engine_doc && !hasResetForm) {
      const formData = {
        default_content_processing_engine_doc: settings.default_content_processing_engine_doc as 'auto' | 'docling' | 'simple',
        default_content_processing_engine_url: settings.default_content_processing_engine_url as 'auto' | 'firecrawl' | 'jina' | 'crawl4ai' | 'simple',
        default_embedding_option: settings.default_embedding_option as 'ask' | 'always' | 'never',
        auto_delete_files: settings.auto_delete_files as 'yes' | 'no',
        docling_ocr: settings.docling_ocr ?? true,
        docling_formulas: settings.docling_formulas ?? false,
        docling_vision: settings.docling_vision ?? false,
        default_video_voice: settings.default_video_voice || 'vi-VN-HoaiMyNeural',
        default_video_aspect_ratio: settings.default_video_aspect_ratio || '16:9',
        default_video_duration: settings.default_video_duration || '3',
        default_video_style: normalizeVideoTemplateId(settings.default_video_style),
        default_video_character: settings.default_video_character || 'AI tự chọn',
      }
      reset(formData)
      setHasResetForm(true)
    }
  }, [hasResetForm, reset, settings])

  const onSubmit = async (data: SettingsFormData) => {
    await updateSettings.mutateAsync(data)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t('settings.loadFailed')}</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : t('common.error')}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.contentProcessing')}</CardTitle>
          <CardDescription>
            {t('settings.contentProcessingDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="doc_engine">{t('settings.docEngine')}</Label>
            <Controller
              name="default_content_processing_engine_doc"
              control={control}
              render={({ field }) => (
                  <Select
                    key={field.value}
                    name={field.name}
                    value={field.value || ''}
                    onValueChange={field.onChange}
                    disabled={field.disabled || isLoading}
                  >
                      <SelectTrigger id="doc_engine" className="w-full">
                        <SelectValue placeholder={t('settings.docEnginePlaceholder')} />
                      </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">{t('settings.autoRecommended')}</SelectItem>
                      <SelectItem value="docling" disabled={!doclingAvailable}>{t('settings.docling')}</SelectItem>
                      <SelectItem value="simple">{t('settings.simple')}</SelectItem>
                    </SelectContent>
                  </Select>
              )}
            />
            {!doclingAvailable && (
              <p className="text-sm text-muted-foreground">{t('settings.enableDoclingHint')}</p>
            )}
            <Collapsible open={expandedSections.doc} onOpenChange={() => toggleSection('doc')}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <IconChevronDown className={`h-4 w-4 transition-transform ${expandedSections.doc ? 'rotate-180' : ''}`} />
                {t('settings.helpMeChoose')}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 text-sm text-muted-foreground space-y-2">
                <p>{t('settings.docHelp')}</p>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Controller
                name="docling_ocr"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="docling_ocr"
                    checked={field.value ?? true}
                    onCheckedChange={field.onChange}
                    disabled={field.disabled || isLoading || !doclingAvailable}
                  />
                )}
              />
              <Label htmlFor="docling_ocr">{t('settings.ocrEnabled')}</Label>
            </div>
            <p className="text-sm text-muted-foreground">{t('settings.ocrHelp')}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Controller
                name="docling_formulas"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="docling_formulas"
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                    disabled={field.disabled || isLoading || !doclingAvailable}
                  />
                )}
              />
              <Label htmlFor="docling_formulas">{t('settings.formulasEnabled')}</Label>
            </div>
            <p className="text-sm text-muted-foreground">{t('settings.formulasHelp')}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Controller
                name="docling_vision"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="docling_vision"
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                    disabled={field.disabled || isLoading || !doclingAvailable}
                  />
                )}
              />
              <Label htmlFor="docling_vision">{t('settings.visionEnabled')}</Label>
            </div>
            <p className="text-sm text-muted-foreground">{t('settings.visionHelp')}</p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="url_engine">{t('settings.urlEngine')}</Label>
            <Controller
              name="default_content_processing_engine_url"
              control={control}
              render={({ field }) => (
                <Select
                  key={field.value}
                  name={field.name}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  disabled={field.disabled || isLoading}
                >
                  <SelectTrigger id="url_engine" className="w-full">
                    <SelectValue placeholder={t('settings.urlEnginePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{t('settings.autoRecommended')}</SelectItem>
                    <SelectItem value="firecrawl">{t('settings.firecrawl')}</SelectItem>
                    <SelectItem value="jina">{t('settings.jina')}</SelectItem>
                    <SelectItem value="crawl4ai" disabled={!crawl4aiAvailable}>{t('settings.crawl4ai')}</SelectItem>
                    <SelectItem value="simple">{t('settings.simple')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {!crawl4aiAvailable && (
              <p className="text-sm text-muted-foreground">{t('settings.enableCrawl4aiHint')}</p>
            )}
             <Collapsible open={expandedSections.url} onOpenChange={() => toggleSection('url')}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <IconChevronDown className={`h-4 w-4 transition-transform ${expandedSections.url ? 'rotate-180' : ''}`} />
                {t('settings.helpMeChoose')}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 text-sm text-muted-foreground space-y-2">
                <p>{t('settings.urlHelp')}</p>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardContent>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle>{t('settings.embeddingAndSearch')}</CardTitle>
          <CardDescription>
            {t('settings.embeddingAndSearchDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <div className="space-y-3">
            <Label htmlFor="embedding">{t('settings.defaultEmbeddingOption')}</Label>
            <Controller
              name="default_embedding_option"
              control={control}
              render={({ field }) => (
                <Select
                  key={field.value}
                  name={field.name}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  disabled={field.disabled || isLoading}
                >
                  <SelectTrigger id="embedding" className="w-full">
                    <SelectValue placeholder={t('settings.embeddingOptionPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ask">{t('settings.ask')}</SelectItem>
                    <SelectItem value="always">{t('settings.always')}</SelectItem>
                    <SelectItem value="never">{t('settings.never')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
             <Collapsible open={expandedSections.embedding} onOpenChange={() => toggleSection('embedding')}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <IconChevronDown className={`h-4 w-4 transition-transform ${expandedSections.embedding ? 'rotate-180' : ''}`} />
                {t('settings.helpMeChoose')}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 text-sm text-muted-foreground space-y-2">
                <p>{t('settings.embeddingHelp')}</p>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardContent>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle>{t('settings.fileManagement')}</CardTitle>
          <CardDescription>
            {t('settings.fileManagementDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <div className="space-y-3">
            <Label htmlFor="auto_delete">{t('settings.autoDeleteFiles')}</Label>
            <Controller
              name="auto_delete_files"
              control={control}
              render={({ field }) => (
                <Select
                  key={field.value}
                  name={field.name}
                  value={field.value || ''}
                  onValueChange={field.onChange}
                  disabled={field.disabled || isLoading}
                >
                  <SelectTrigger id="auto_delete" className="w-full">
                    <SelectValue placeholder={t('settings.autoDeletePlaceholder')} />
                  </SelectTrigger>
                   <SelectContent>
                    <SelectItem value="yes">{t('common.yes')}</SelectItem>
                    <SelectItem value="no">{t('common.no')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
             <Collapsible open={expandedSections.files} onOpenChange={() => toggleSection('files')}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <IconChevronDown className={`h-4 w-4 transition-transform ${expandedSections.files ? 'rotate-180' : ''}`} />
                {t('settings.helpMeChoose')}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 text-sm text-muted-foreground space-y-2">
                <p>{t('settings.filesHelp')}</p>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.videoDefaults')}</CardTitle>
          <CardDescription>
            {t('settings.videoDefaultsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <Label htmlFor="video_voice">{t('settings.videoVoice')}</Label>
              <Controller
                name="default_video_voice"
                control={control}
                render={({ field }) => (
                  <Select
                    key={field.value}
                    name={field.name}
                    value={field.value || 'vi-VN-HoaiMyNeural'}
                    onValueChange={field.onChange}
                    disabled={field.disabled || isLoading}
                  >
                    <SelectTrigger id="video_voice" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vi-VN-NamMinhNeural">Vietnamese Male (Eric)</SelectItem>
                      <SelectItem value="vi-VN-HoaiMyNeural">Vietnamese Female (Luna)</SelectItem>
                      <SelectItem value="en-US-GuyNeural">English Male (Eric)</SelectItem>
                      <SelectItem value="en-US-JennyNeural">English Female (Luna)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="video_aspect_ratio">{t('settings.videoAspectRatio')}</Label>
              <Controller
                name="default_video_aspect_ratio"
                control={control}
                render={({ field }) => (
                  <Select
                    key={field.value}
                    name={field.name}
                    value={field.value || '16:9'}
                    onValueChange={field.onChange}
                    disabled={field.disabled || isLoading}
                  >
                    <SelectTrigger id="video_aspect_ratio" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16:9">Ngang (16:9 - YouTube/Web)</SelectItem>
                      <SelectItem value="9:16">Dọc (9:16 - TikTok/Shorts)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="video_duration">{t('settings.videoDuration')}</Label>
              <Controller
                name="default_video_duration"
                control={control}
                render={({ field }) => (
                  <Select
                    key={field.value}
                    name={field.name}
                    value={field.value || '3'}
                    onValueChange={field.onChange}
                    disabled={field.disabled || isLoading}
                  >
                    <SelectTrigger id="video_duration" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 {t('common.minutes')}</SelectItem>
                      <SelectItem value="3">3 {t('common.minutes')}</SelectItem>
                      <SelectItem value="5">5 {t('common.minutes')}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="video_style">{t('settings.videoStyle')}</Label>
              <Controller
                name="default_video_style"
                control={control}
                render={({ field }) => (
                  <Select
                    key={field.value}
                    name={field.name}
                    value={field.value || 'auto'}
                    onValueChange={field.onChange}
                    disabled={field.disabled || isLoading}
                  >
                    <SelectTrigger id="video_style" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">{t('common.videoTemplateAuto')} ({t('common.recommended')})</SelectItem>
                      {VIDEO_TEMPLATE_CHOICES.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} · {template.tone === 'light' ? t('common.light') : t('common.dark')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="video_character">{t('settings.videoCharacter')}</Label>
              <Controller
                name="default_video_character"
                control={control}
                render={({ field }) => (
                  <Select
                    key={field.value}
                    name={field.name}
                    value={field.value || 'AI tự chọn'}
                    onValueChange={field.onChange}
                    disabled={field.disabled || isLoading}
                  >
                    <SelectTrigger id="video_character" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AI tự chọn">🤖 AI Tự chọn</SelectItem>
                      <SelectItem value="Eric">Eric</SelectItem>
                      <SelectItem value="Luna">Luna</SelectItem>
                      <SelectItem value="Penguin">🐧 Penguin</SelectItem>
                      <SelectItem value="Cat">🐱 Cat</SelectItem>
                      <SelectItem value="Fox">🦊 Fox</SelectItem>
                      <SelectItem value="Rabbit">🐰 Rabbit</SelectItem>
                      <SelectItem value="Bear">🐻 Bear</SelectItem>
                      <SelectItem value="Robot">🤖 Robot</SelectItem>
                      <SelectItem value="Owl">🦉 Owl</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
         <Button 
          type="submit" 
          disabled={!isDirty || updateSettings.isPending}
        >
          {updateSettings.isPending ? t('common.saving') : t('common.save')}
        </Button>
      </div>
    </form>
  )
}

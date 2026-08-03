"use client"

import { Control, Controller } from "react-hook-form"
import { useTranslation } from "@/lib/hooks/use-translation"
import { CheckboxList } from "@/components/ui/checkbox-list"
import { Checkbox } from "@/components/ui/checkbox"
import { Transformation } from "@/lib/types/transformations"
import { SettingsResponse } from "@/lib/types/api"
import { cn } from "@/lib/utils"
import { IconCheck, IconSettings, IconSparkles } from '@tabler/icons-react'

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

interface ProcessingStepProps {
  control: Control<CreateSourceFormData>
  transformations: Transformation[]
  selectedTransformations: string[]
  onToggleTransformation: (transformationId: string) => void
  loading?: boolean
  settings?: SettingsResponse
}

export function ProcessingStep({
  control,
  transformations,
  selectedTransformations,
  onToggleTransformation,
  loading = false,
  settings
}: ProcessingStepProps) {
  const { t } = useTranslation()
  const translateTransformation = (title: string, desc: string) => {
    const map: Record<string, { title: string, desc: string }> = {
      'Paper Analysis': { title: 'Phân tích tài liệu', desc: 'Phân tích chuyên sâu các tài liệu khoa học/kỹ thuật' },
      'Dense Summary': { title: 'Tóm tắt chi tiết', desc: 'Tạo bản tóm tắt phong phú, sâu sắc về nội dung' },
      'Key Insights': { title: 'Thông tin cốt lõi', desc: 'Trích xuất những hiểu biết quan trọng và các mục có thể hành động' },
      'Reflection Questions': { title: 'Câu hỏi gợi mở', desc: 'Tạo các câu hỏi phản tư từ tài liệu để giúp khám phá sâu hơn' },
    }
    return map[title] || { title, desc }
  }

  const transformationItems = transformations.map((transformation) => {
    const localized = translateTransformation(transformation.title, transformation.description || '')
    return {
      id: transformation.id,
      title: localized.title,
      description: localized.desc
    }
  })

  return (
    <div className="space-y-5">
      {/* Transformations */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-500/10">
            <IconSparkles className="h-3.5 w-3.5 text-violet-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {t('navigation.transformations')}
              <span className="ml-1.5 text-muted-foreground font-normal text-xs">({t('common.optional')})</span>
            </h3>
            <p className="text-xs text-muted-foreground">Chọn các phân tích AI để áp dụng tự động</p>
          </div>
        </div>
        <CheckboxList
          items={transformationItems}
          selectedIds={selectedTransformations}
          onToggle={onToggleTransformation}
          loading={loading}
          emptyMessage={t('common.noMatches')}
        />
      </div>

      {/* Embedding Settings */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-sky-500/10">
            <IconSettings className="h-3.5 w-3.5 text-sky-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t('navigation.settings')}</h3>
            <p className="text-xs text-muted-foreground">Cấu hình xử lý nội dung</p>
          </div>
        </div>

        <div className="space-y-2.5">
          {settings?.default_embedding_option === 'ask' && (
            <Controller
              control={control}
              name="embed"
              render={({ field }) => (
                <label
                  htmlFor="enable-embedding"
                  className={cn(
                    "flex items-start gap-3 cursor-pointer p-3.5 rounded-xl transition-all border-2",
                    field.value
                      ? "bg-primary/5 border-primary/30"
                      : "bg-card border-border hover:border-primary/30 hover:bg-primary/3"
                  )}
                >
                  <Checkbox
                    id="enable-embedding"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <span className={cn("text-[14px] font-semibold block transition-colors", field.value ? "text-primary" : "text-foreground")}>
                      {t('sources.enableEmbedding')}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {t('sources.embeddingDesc')}
                    </p>
                  </div>
                </label>
              )}
            />
          )}

          {settings?.default_embedding_option === 'always' && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl border-2 border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/15 flex-shrink-0 mt-0.5">
                <IconCheck className="h-3 w-3 text-emerald-600" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-semibold block text-foreground">{t('sources.embeddingAlways')}</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('sources.embeddingAlwaysDesc')}
                  {t('sources.changeInSettings')} <span className="font-medium">{t('navigation.settings')}</span>.
                </p>
              </div>
            </div>
          )}

          {settings?.default_embedding_option === 'never' && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl border-2 border-border bg-muted/30">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-muted flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-muted-foreground" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-semibold block text-foreground">{t('sources.embeddingNever')}</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('sources.embeddingNeverDesc')}
                  {t('sources.changeInSettings')} <span className="font-medium">{t('navigation.settings')}</span>.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

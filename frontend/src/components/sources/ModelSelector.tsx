'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { IconAdjustmentsHorizontal, IconCheck } from '@tabler/icons-react'
import { useModelDefaults, useModels } from '@/lib/hooks/use-models'
import { useTranslation } from '@/lib/hooks/use-translation'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command'

interface ModelSelectorProps {
  currentModel?: string
  onModelChange: (model?: string) => void
  disabled?: boolean
}

export function ModelSelector({
  currentModel,
  onModelChange,
  disabled = false
}: ModelSelectorProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState(currentModel || 'default')
  const { data: models, isLoading } = useModels()
  const { data: defaults } = useModelDefaults()

  useEffect(() => {
    setSelectedModel(currentModel || 'default')
  }, [currentModel])

  // Filter for language models only and sort by name
  const languageModels = useMemo(() => {
    if (!models) {
      return []
    }
    return [...models]
      .filter((model) => model.type === 'language')
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [models])

  const defaultModel = useMemo(() => {
    if (!defaults?.default_chat_model) return undefined
    return languageModels.find(model => model.id === defaults.default_chat_model)
  }, [defaults?.default_chat_model, languageModels])

  const currentModelName = useMemo(() => {
    if (currentModel) {
      return languageModels.find(model => model.id === currentModel)?.name || currentModel
    }
    if (defaultModel) {
      return defaultModel.name
    }
    return t('common.default')
  }, [currentModel, languageModels, defaultModel, t])

  const handleSave = () => {
    onModelChange(selectedModel === 'default' ? undefined : selectedModel)
    setOpen(false)
  }

  const handleReset = () => {
    setSelectedModel('default')
    onModelChange(undefined)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-label={`${t('chat.model')}: ${currentModelName}`}
          className="h-8 max-w-[190px] gap-1.5 rounded-full border border-border/70 bg-muted/35 px-2.5 text-muted-foreground shadow-none hover:bg-muted hover:text-foreground"
        >
          <IconAdjustmentsHorizontal className="h-3.5 w-3.5" />
          <span className="truncate text-xs">
            {currentModelName}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="p-0 sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 border-b px-5 pb-4 pt-5 pr-12">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border bg-muted text-muted-foreground">
              <IconAdjustmentsHorizontal className="h-4 w-4" />
            </span>
            {t('common.modelConfiguration')}
          </DialogTitle>
          <DialogDescription className="px-5">
            {t('transformations.overrideModelDesc')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 px-5">
          <div className="overflow-hidden rounded-lg border">
            <Command>
              <CommandInput placeholder={t('models.searchOrAddModel')} />
              <CommandList className="max-h-[280px] p-1">
                <CommandEmpty>{t('models.noModelsFound')}</CommandEmpty>
                <CommandItem
                  value={`default ${defaultModel?.name ?? ''} ${defaultModel?.provider ?? ''}`}
                  onSelect={() => setSelectedModel('default')}
                  className="min-h-11 gap-3 px-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {defaultModel
                        ? `${t('common.default')} (${defaultModel.name})`
                        : t('transformations.systemDefault')}
                    </p>
                    {defaultModel?.provider && <p className="mt-0.5 text-xs text-muted-foreground">{defaultModel.provider}</p>}
                  </div>
                  {selectedModel === 'default' && <IconCheck className="h-4 w-4" />}
                </CommandItem>
                {isLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : languageModels.map((model) => (
                  <CommandItem
                    key={model.id}
                    value={`${model.name} ${model.provider}`}
                    onSelect={() => setSelectedModel(model.id)}
                    className="min-h-11 gap-3 px-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{model.name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{model.provider}</p>
                    </div>
                    {selectedModel === model.id && <IconCheck className="h-4 w-4" />}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </div>
          {selectedModel && selectedModel !== 'default' && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">
                {t('transformations.sessionUseReplacement', { name: languageModels.find(m => m.id === selectedModel)?.name || selectedModel })}
              </p>
            </div>
          )}
        </div>
        <DialogFooter className="border-t px-5 py-4 sm:justify-between">
          <Button variant="outline" onClick={handleReset}>
            {t('common.resetToDefault')}
          </Button>
          <Button onClick={handleSave}>
            {t('common.saveChanges')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

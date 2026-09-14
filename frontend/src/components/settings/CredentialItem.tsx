'use client'

import { useState } from 'react'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { IconAlertTriangle, IconCheck, IconEdit, IconKey, IconLoader2, IconPlug, IconRefresh, IconRobot, IconTrash, IconX } from '@tabler/icons-react'
import { useTranslation } from '@/lib/hooks/use-translation'
import { useDeleteModel, useTestModel } from '@/lib/hooks/use-models'
import { useCredential, useTestCredential } from '@/lib/hooks/use-credentials'
import { Credential } from '@/lib/api/credentials'
import { Model, ModelDefaults } from '@/lib/types/models'
import { modelsApi } from '@/lib/api/models'
import {
  MODEL_TYPES,
  getTypeIcon,
  getTypeColor,
  getTypeLabel,
  TYPE_COLOR_INACTIVE,
} from '@/lib/providers'
import { ModelTestResultDialog } from './ModelTestResultDialog'
import { CredentialFormDialog } from './CredentialFormDialog'
import { DeleteCredentialDialog } from './DeleteCredentialDialog'
import { DiscoverModelsDialog } from './DiscoverModelsDialog'
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

interface CredentialItemProps {
  credential: Credential
  models: Model[]
  defaults: ModelDefaults | null
  allCredentials: Credential[]
}

export function CredentialItem({
  credential,
  models,
  defaults,
  allCredentials,
}: CredentialItemProps) {
  const { t } = useTranslation()
  const { testCredential, isPending: isTestPending, testResults } = useTestCredential()
  const { testModel, isPending: isModelTestPending, testingModelId, testResult: modelTestResult, testedModelName, clearResult: clearModelTestResult } = useTestModel()
  const deleteModel = useDeleteModel()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [discoverOpen, setDiscoverOpen] = useState(false)
  const [batchTesting, setBatchTesting] = useState(false)
  const [batchResults, setBatchResults] = useState<Record<string, { success: boolean; message: string }>>({})
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([])
  const [deletingSelected, setDeletingSelected] = useState(false)
  // Full credential data needed for edit form
  const { data: fullCredential } = useCredential(editOpen ? credential.id : '')

  const linkedModels = models.filter(m => m.credential === credential.id)
  const activeTypes = new Set<string>(linkedModels.map(m => m.type))
  const testResult = testResults[credential.id]
  const failedBatchModels = linkedModels.filter(model => batchResults[model.id] && !batchResults[model.id].success)

  const handleBatchTest = async () => {
    if (linkedModels.length === 0 || batchTesting) return
    setBatchTesting(true)
    const results: Record<string, { success: boolean; message: string }> = {}
    try {
      for (let index = 0; index < linkedModels.length; index += 3) {
        const chunk = linkedModels.slice(index, index + 3)
        const settled = await Promise.all(chunk.map(async model => {
          try {
            return [model.id, await modelsApi.testModel(model.id)] as const
          } catch (error) {
            return [model.id, { success: false, message: error instanceof Error ? error.message : 'Test failed' }] as const
          }
        }))
        for (const [modelId, result] of settled) results[modelId] = result
        setBatchResults(previous => ({ ...previous, ...results }))
      }
    } finally {
      setBatchTesting(false)
    }
  }

  const toggleModelSelection = (modelId: string) => {
    setSelectedModelIds(current => current.includes(modelId)
      ? current.filter(id => id !== modelId)
      : [...current, modelId])
  }

  const handleDeleteSelected = async (modelIds = selectedModelIds) => {
    if (modelIds.length === 0) return
    setDeletingSelected(true)
    try {
      for (const modelId of modelIds) await deleteModel.mutateAsync(modelId)
      setSelectedModelIds([])
      setBatchResults({})
    } finally {
      setDeletingSelected(false)
    }
  }

  // IconCheck which models are defaults
  const defaultSlots: Record<string, string> = {}
  if (defaults) {
    const slotMap: Record<string, string | null | undefined> = {
      'Chat': defaults.default_chat_model,
      'Transform': defaults.default_transformation_model,
      'Tools': defaults.default_tools_model,
      'Large Ctx': defaults.large_context_model,
      'Embedding': defaults.default_embedding_model,
      'TTS': defaults.default_text_to_speech_model,
      'STT': defaults.default_speech_to_text_model,
    }
    for (const [slot, modelId] of Object.entries(slotMap)) {
      if (modelId) defaultSlots[modelId] = slot
    }
  }

  return (
    <>
      <div className="border rounded-lg p-3 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium truncate">{credential.name}</span>
            <div className="flex gap-1">
              {credential.modalities.map(mod => (
                <Badge
                  key={mod}
                  variant="secondary"
                  className={`text-[10px] gap-0.5 px-1 py-0 ${activeTypes.has(mod) ? getTypeColor(mod) : TYPE_COLOR_INACTIVE}`}
                >
                  {getTypeIcon(mod)}
                  <span className="hidden sm:inline">{getTypeLabel(mod)}</span>
                </Badge>
              ))}
            </div>
            {credential.has_api_key && (
              <Badge variant="outline" className="text-[10px]">
                <IconKey className="h-2.5 w-2.5 mr-0.5" />
                API key
              </Badge>
            )}
          </div>
          <div className="flex max-w-full flex-wrap items-center justify-end gap-1 shrink-0">
            {testResult && (
              testResult.success
                ? <IconCheck className="h-4 w-4 text-fern" />
                : <IconX className="h-4 w-4 text-destructive" />
            )}
            <Button
              variant="ghost" size="sm"
              onClick={() => testCredential(credential.id)}
              disabled={isTestPending || !!credential.decryption_error}
              title={t('apiKeys.testConnection')}
            >
              {isTestPending ? <IconLoader2 className="h-4 w-4 animate-spin" /> : <IconPlug className="h-4 w-4" />}
              <span className="hidden text-xs lg:inline">Test</span>
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={handleBatchTest}
              disabled={batchTesting || linkedModels.length === 0 || !!credential.decryption_error}
              title="Test tất cả model"
            >
              {batchTesting ? <IconLoader2 className="h-4 w-4 animate-spin" /> : <IconRefresh className="h-4 w-4" />}
              <span className="hidden text-xs lg:inline">Test tất cả</span>
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => setDiscoverOpen(true)}
              disabled={!!credential.decryption_error}
              title={t('apiKeys.syncModels')}
            >
              <IconRobot className="h-4 w-4" />
              <span className="hidden text-xs lg:inline">Models</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)} disabled={!!credential.decryption_error} title={t('common.edit')}>
              <IconEdit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => setDeleteOpen(true)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              title={t('common.delete')}
            >
              <IconTrash className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Decryption error warning */}
        {credential.decryption_error && (
          <Alert className="border-warn/30 bg-warn-tint">
            <IconAlertTriangle className="h-4 w-4 text-warn" />
            <AlertTitle className="text-warn">{t('apiKeys.decryptionError')}</AlertTitle>
            <AlertDescription className="text-warn text-sm">
              {t('apiKeys.decryptionErrorDescription')}
            </AlertDescription>
          </Alert>
        )}

        {/* Linked models grouped by type */}
        {linkedModels.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex flex-wrap items-center gap-2 border-b pb-2 text-xs">
              <label className="flex cursor-pointer items-center gap-1.5 text-muted-foreground">
                <input
                  type="checkbox"
                  checked={selectedModelIds.length === linkedModels.length}
                  onChange={event => setSelectedModelIds(event.target.checked ? linkedModels.map(model => model.id) : [])}
                />
                Chọn tất cả
              </label>
              {selectedModelIds.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={deletingSelected}>
                      {deletingSelected ? <IconLoader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <IconTrash className="mr-1.5 h-3 w-3" />}
                      Xóa {selectedModelIds.length} model
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Xóa các model đã chọn?</AlertDialogTitle>
                      <AlertDialogDescription>Thao tác này sẽ gỡ {selectedModelIds.length} model khỏi credential này.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Hủy</AlertDialogCancel>
                      <AlertDialogAction onClick={() => void handleDeleteSelected()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Xóa model</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            {MODEL_TYPES
              .filter(type => linkedModels.some(m => m.type === type))
              .map(type => (
                <div key={type} className="flex items-start gap-1.5">
                  <Badge
                    variant="outline"
                    className={`text-[10px] gap-0.5 px-1 py-0 shrink-0 mt-0.5 ${getTypeColor(type)}`}
                  >
                    {getTypeIcon(type)}
                    {getTypeLabel(type)}
                  </Badge>
                  <div className="flex flex-wrap gap-1">
                    {linkedModels.filter(m => m.type === type).map(model => {
                      const defaultSlot = defaultSlots[model.id]
                      return (
                        <Badge
                          key={model.id}
                          variant={defaultSlot ? 'default' : 'secondary'}
                          className="font-mono text-[11px] gap-1 pr-0.5 group/model"
                        >
                          <input
                            type="checkbox"
                            checked={selectedModelIds.includes(model.id)}
                            onChange={() => toggleModelSelection(model.id)}
                            onClick={event => event.stopPropagation()}
                            aria-label={`Chọn ${model.name}`}
                            className="mr-0.5"
                          />
                          {model.name}
                          {defaultSlot && <span className="ml-0.5 opacity-75">({defaultSlot})</span>}
                          {batchResults[model.id] && (
                            batchResults[model.id].success
                              ? <IconCheck className="h-3 w-3 text-fern" aria-label="Đạt" />
                              : <IconX className="h-3 w-3 text-destructive" aria-label="Không đạt" />
                          )}
                          <button
                            className="ml-0.5 opacity-0 group-hover/model:opacity-60 hover:!opacity-100 transition-opacity"
                            onClick={() => testModel(model.id, model.name)}
                            disabled={isModelTestPending && testingModelId === model.id}
                            title={t('models.testModel')}
                          >
                            {isModelTestPending && testingModelId === model.id
                              ? <IconLoader2 className="h-3 w-3 animate-spin" />
                              : <IconPlug className="h-3 w-3" />
                            }
                          </button>
                          <button
                            className="opacity-0 group-hover/model:opacity-60 hover:!opacity-100 hover:text-destructive transition-opacity"
                            onClick={() => deleteModel.mutate(model.id)}
                            title={t('models.deleteModel')}
                          >
                            <IconX className="h-3 w-3" />
                          </button>
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              ))}
            {Object.keys(batchResults).length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                <span className="font-medium text-fern">Đạt: {linkedModels.filter(model => batchResults[model.id]?.success).length}</span>
                <span className="font-medium text-destructive">Không đạt: {linkedModels.filter(model => batchResults[model.id] && !batchResults[model.id].success).length}</span>
                {batchTesting && <span className="text-muted-foreground">Đang kiểm tra...</span>}
                {!batchTesting && failedBatchModels.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={deletingSelected}>
                        <IconTrash className="mr-1.5 h-3 w-3" />
                        Xóa model không đạt ({failedBatchModels.length})
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Xóa model không đạt?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Sẽ xóa {failedBatchModels.length} model đã kiểm tra thất bại. Các model đạt sẽ được giữ lại.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            void handleDeleteSelected(failedBatchModels.map(model => model.id))
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Xóa model không đạt
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            )}
          </div>
        )}


      </div>

      {/* IconEdit dialog */}
      {editOpen && (
        <CredentialFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          provider={credential.provider}
          credential={fullCredential || credential}
        />
      )}

      {/* Delete dialog */}
      {deleteOpen && (
        <DeleteCredentialDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          credential={credential}
          allCredentials={allCredentials}
        />
      )}

      {/* Discover models dialog */}
      {discoverOpen && (
        <DiscoverModelsDialog
          open={discoverOpen}
          onOpenChange={setDiscoverOpen}
          credential={credential}
        />
      )}

      {/* Model test result dialog */}
      <ModelTestResultDialog
        open={modelTestResult !== null}
        onOpenChange={(open) => { if (!open) clearModelTestResult() }}
        result={modelTestResult}
        modelName={testedModelName}
      />
    </>
  )
}

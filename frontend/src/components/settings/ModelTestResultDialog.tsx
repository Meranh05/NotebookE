'use client'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { IconCheck, IconX } from '@tabler/icons-react'
import { useTranslation } from '@/lib/hooks/use-translation'
import { ModelTestResult } from '@/lib/types/models'

export function ModelTestResultDialog({
  open,
  onOpenChange,
  result,
  modelName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  result: ModelTestResult | null
  modelName: string
}) {
  const { t } = useTranslation()

  if (!result) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <DialogHeader className={`border-b px-6 py-5 pr-14 ${result.success ? 'bg-fern/5' : 'bg-destructive/5'}`}>
          <DialogTitle className="flex items-center gap-2">
            {result.success ? (
              <IconCheck className="h-5 w-5 text-fern" />
            ) : (
              <IconX className="h-5 w-5 text-destructive" />
            )}
            {result.success ? t('models.testModelSuccess') : t('models.testModelFailed')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 px-6 py-5">
          <p className="text-sm text-muted-foreground">{modelName}</p>
          <p className="text-sm">{result.message}</p>

          {result.details && (
            <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-60 whitespace-pre-wrap break-words">
              {result.details}
            </pre>
          )}
        </div>

        <DialogFooter className="border-t bg-muted/10 px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.done')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

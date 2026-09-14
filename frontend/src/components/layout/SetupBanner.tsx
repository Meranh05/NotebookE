'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { IconAlertTriangle, IconArrowRight, IconExternalLink, IconShieldLock } from '@tabler/icons-react'
import { useTranslation } from '@/lib/hooks/use-translation'
import { useCredentialStatus, useEnvStatus } from '@/lib/hooks/use-credentials'

export function SetupBanner() {
  const { t } = useTranslation()
  const { data: credentialStatus } = useCredentialStatus()
  const { data: envStatus } = useEnvStatus()

  const encryptionReady = credentialStatus?.encryption_configured ?? true

  const providersToMigrate = useMemo(() => {
    if (!envStatus || !credentialStatus) return []
    const providers: string[] = []
    for (const provider in envStatus) {
      if (envStatus[provider] && credentialStatus.source[provider] === 'environment') {
        providers.push(provider)
      }
    }
    return providers
  }, [envStatus, credentialStatus])

  if (encryptionReady && providersToMigrate.length === 0) {
    return null
  }

  if (!encryptionReady) {
    return (
      <div className="px-4 pt-3">
        <Alert className="border-destructive/30 bg-destructive-tint">
          <IconShieldLock className="h-4 w-4 text-destructive" />
          <AlertTitle className="text-destructive">
            {t('setupBanner.encryptionRequired')}
          </AlertTitle>
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-destructive">
            <span>{t('setupBanner.encryptionRequiredDescription')}</span>
            <a
              href="https://github.com/Meranh05/NotebookE/blob/main/docs/3-USER-GUIDE/api-configuration.md#encryption-setup"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center shrink-0 text-sm font-medium underline underline-offset-2 hover:text-destructive/80"
            >
              {t('setupBanner.viewDocs')}
              <IconExternalLink className="ml-1 h-3 w-3" />
            </a>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="px-4 pt-3">
      <Alert className="border-warn/30 bg-warn-tint">
        <IconAlertTriangle className="h-4 w-4 text-warn" />
        <AlertTitle className="text-warn">
          {t('setupBanner.migrationAvailable')}
        </AlertTitle>
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-warn">
            {t('setupBanner.migrationDescription', { count: providersToMigrate.length })}
          </span>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="shrink-0 border-warn text-warn hover:bg-warn-tint"
          >
            <Link href="/settings/api-keys">
              {t('setupBanner.goToSettings')}
              <IconArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  )
}

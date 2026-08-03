'use client'

import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { IconAlertTriangle, IconArrowRight, IconLoader2 } from '@tabler/icons-react'
import { useTranslation } from '@/lib/hooks/use-translation'
import { useMigrateFromEnv } from '@/lib/hooks/use-credentials'

interface MigrationBannerProps {
  providersToMigrate: string[]
}

export function MigrationBanner({ providersToMigrate }: MigrationBannerProps) {
  const { t } = useTranslation()
  const migrate = useMigrateFromEnv()

  if (providersToMigrate.length === 0) {
    return null
  }

  return (
    <Alert className="border-warn/30 bg-warn-tint">
      <IconAlertTriangle className="h-4 w-4 text-warn" />
      <AlertTitle className="text-warn">
        {t('apiKeys.migrationAvailable')}
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-warn">
          {t('apiKeys.migrationDescription', { count: providersToMigrate.length })}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => migrate.mutate()}
          disabled={migrate.isPending}
          className="shrink-0 border-warn text-warn hover:bg-warn-tint"
        >
          {migrate.isPending ? (
            <>
              <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('apiKeys.migrating')}
            </>
          ) : (
            <>
              {t('apiKeys.migrateToDatabase')}
              <IconArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </AlertDescription>
    </Alert>
  )
}

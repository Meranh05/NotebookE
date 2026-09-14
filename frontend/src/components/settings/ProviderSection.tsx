'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { IconCheck, IconChevronDown, IconPlus, IconX } from '@tabler/icons-react'
import { useTranslation } from '@/lib/hooks/use-translation'
import { Credential } from '@/lib/api/credentials'
import { ProviderInfo } from '@/lib/api/providers'
import { Model, ModelDefaults } from '@/lib/types/models'
import {
  getTypeIcon,
  getTypeColor,
  getTypeLabel,
  TYPE_COLOR_INACTIVE,
} from '@/lib/providers'
import { CredentialFormDialog } from './CredentialFormDialog'
import { CredentialItem } from './CredentialItem'

interface ProviderSectionProps {
  provider: ProviderInfo
  credentials: Credential[]
  models: Model[]
  defaults: ModelDefaults | null
  allCredentials: Credential[]
  encryptionReady: boolean
}

export function ProviderSection({
  provider,
  credentials,
  models,
  defaults,
  allCredentials,
  encryptionReady,
}: ProviderSectionProps) {
  const { t } = useTranslation()
  const [addOpen, setAddOpen] = useState(false)

  const displayName = provider.display_name || provider.name
  const modalities = provider.modalities.length > 0 ? provider.modalities : ['language']
  const hasCredentials = credentials.length > 0
  const [isOpen, setIsOpen] = useState(false)

  // Models linked to any credential of this provider
  const providerModels = models.filter(m =>
    credentials.some(c => c.id === m.credential)
  )
  const activeTypes = new Set<string>(providerModels.map(m => m.type))

  return (
    <Card className={`overflow-hidden transition-shadow hover:shadow-sm ${hasCredentials ? 'border-l-2 border-l-fern' : 'bg-muted/10'}`}>
      <CardHeader className="p-4 pb-3">
        <button type="button" className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setIsOpen(current => !current)} aria-expanded={isOpen}>
          <div className="flex min-w-0 items-center gap-3 flex-wrap">
            <div className="min-w-0">
              <CardTitle className={`truncate text-base capitalize ${hasCredentials ? '' : 'text-muted-foreground'}`}>{displayName}</CardTitle>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{credentials.length} credential{credentials.length === 1 ? '' : 's'} · {providerModels.length} model{providerModels.length === 1 ? '' : 's'}</p>
            </div>
            <div className="flex items-center gap-1">
              {modalities.map((type) => (
                <Badge
                  key={type}
                  variant="secondary"
                  className={`gap-1 px-1.5 py-0.5 text-[10px] ${activeTypes.has(type) ? getTypeColor(type) : TYPE_COLOR_INACTIVE}`}
                >
                  {getTypeIcon(type)}
                  <span className="hidden sm:inline">{getTypeLabel(type)}</span>
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasCredentials ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-fern">
                <IconCheck className="h-3 w-3" />
                {t('apiKeys.configured')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <IconX className="h-3 w-3" />
                {t('apiKeys.notConfigured')}
              </span>
            )}
            <IconChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>
      </CardHeader>
      {isOpen ? <CardContent className="space-y-2 px-4 pb-4 pt-0">
        {credentials.map(cred => (
          <CredentialItem
            key={cred.id}
            credential={cred}
            models={models}
            defaults={defaults}
            allCredentials={allCredentials}
          />
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddOpen(true)}
          className="w-full gap-2"
          disabled={!encryptionReady}
        >
          <IconPlus className="h-4 w-4" />
          {t('apiKeys.addConfig')}
        </Button>
      </CardContent> : <CardContent className="flex items-center justify-between gap-3 px-4 pb-4 pt-0 text-xs text-muted-foreground">
        <span>{hasCredentials ? 'Nội dung đã được thu gọn' : 'Chưa có cấu hình cho provider này'}</span>
        <Button variant="outline" size="sm" onClick={() => setAddOpen(true)} disabled={!encryptionReady} className="h-7 shrink-0 gap-1.5 px-2 text-xs">
          <IconPlus className="h-3 w-3" />
          Thêm
        </Button>
      </CardContent>}

      {addOpen && (
        <CredentialFormDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          provider={provider.name}
        />
      )}
    </Card>
  )
}

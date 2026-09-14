'use client'

import { useMemo, useState } from 'react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { IconAlertCircle, IconAdjustmentsHorizontal, IconChevronDown, IconKey, IconSearch, IconShieldLock, IconX } from '@tabler/icons-react'
import { useTranslation } from '@/lib/hooks/use-translation'
import { useModels, useModelDefaults } from '@/lib/hooks/use-models'
import {
  useCredentials,
  useCredentialStatus,
  useEnvStatus,
} from '@/lib/hooks/use-credentials'
import { useProviders } from '@/lib/hooks/use-providers'
import { Credential } from '@/lib/api/credentials'
import {
  DefaultModelSelectors,
  MigrationBanner,
  ProviderSection,
} from '@/components/settings'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function ApiKeysPage() {
  const { t } = useTranslation()
  const [providerQuery, setProviderQuery] = useState('')
  const [providerFilter, setProviderFilter] = useState<'all' | 'configured' | 'available'>('all')
  const [showDefaultModels, setShowDefaultModels] = useState(false)

  // Data
  const { data: credentials, isLoading: credentialsLoading } = useCredentials()
  const { data: models, isLoading: modelsLoading } = useModels()
  const { data: defaults, isLoading: defaultsLoading } = useModelDefaults()
  const { data: credentialStatus } = useCredentialStatus()
  const { data: envStatus } = useEnvStatus()
  const {
    data: providers,
    isLoading: providersLoading,
    isError: providersError,
  } = useProviders()

  const encryptionReady = credentialStatus?.encryption_configured ?? true

  // Group credentials by provider
  const credentialsByProvider = useMemo(() => {
    const grouped: Record<string, Credential[]> = {}
    for (const provider of providers ?? []) {
      grouped[provider.name] = []
    }
    if (credentials) {
      for (const cred of credentials) {
        if (!grouped[cred.provider]) grouped[cred.provider] = []
        grouped[cred.provider].push(cred)
      }
    }
    return grouped
  }, [credentials, providers])

  // Providers needing migration
  const providersToMigrate = useMemo(() => {
    if (!envStatus || !credentialStatus) return []
    const result: string[] = []
    for (const provider in envStatus) {
      if (envStatus[provider] && credentialStatus.source[provider] === 'environment') {
        result.push(provider)
      }
    }
    return result
  }, [envStatus, credentialStatus])

  // Sort: configured providers first (the backend registry owns the base order)
  const sortedProviders = useMemo(() => {
    return [...(providers ?? [])].sort((a, b) => {
      const aHas = (credentialsByProvider[a.name]?.length || 0) > 0 ? 1 : 0
      const bHas = (credentialsByProvider[b.name]?.length || 0) > 0 ? 1 : 0
      return bHas - aHas
    })
  }, [providers, credentialsByProvider])

  const visibleProviders = useMemo(() => {
    const query = providerQuery.trim().toLowerCase()
    return sortedProviders.filter(provider => {
      const configured = (credentialsByProvider[provider.name]?.length || 0) > 0
      const matchesQuery = !query || `${provider.display_name} ${provider.name}`.toLowerCase().includes(query)
      const matchesFilter = providerFilter === 'all' || (providerFilter === 'configured' ? configured : !configured)
      return matchesQuery && matchesFilter
    })
  }, [sortedProviders, providerQuery, providerFilter, credentialsByProvider])

  const configuredProviderCount = sortedProviders.filter(provider => (credentialsByProvider[provider.name]?.length || 0) > 0).length

  const isLoading = credentialsLoading || modelsLoading || defaultsLoading || providersLoading

  if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
    )
  }

  return (
      <div className="flex-1 overflow-y-auto bg-muted/20">
        <div className="mx-auto w-full max-w-[1600px] space-y-5 p-3 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="border-b pb-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md border bg-muted text-muted-foreground"><IconKey className="h-5 w-5" /></span>
                  {t('apiKeys.title')}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t('apiKeys.description')}</p>
              </div>
              {credentials && <div className="rounded-md border bg-card px-3 py-2 text-sm"><span className="font-semibold">{credentials.length}</span><span className="ml-1.5 text-muted-foreground">cấu hình đang lưu</span></div>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg border bg-card px-4 py-3"><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Provider</p><p className="mt-1 text-xl font-semibold">{sortedProviders.length}</p></div>
            <div className="rounded-lg border bg-card px-4 py-3"><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Đã cấu hình</p><p className="mt-1 text-xl font-semibold">{configuredProviderCount}</p></div>
            <div className="rounded-lg border bg-card px-4 py-3"><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Credential</p><p className="mt-1 text-xl font-semibold">{credentials?.length ?? 0}</p></div>
            <div className="rounded-lg border bg-card px-4 py-3"><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Model</p><p className="mt-1 text-xl font-semibold">{models?.length ?? 0}</p></div>
          </div>

          {/* Encryption warning */}
          {!encryptionReady && (
            <Alert className="border-destructive/30 bg-destructive-tint">
              <IconShieldLock className="h-4 w-4 text-destructive" />
              <AlertTitle className="text-destructive">{t('apiKeys.encryptionRequired')}</AlertTitle>
              <AlertDescription className="text-destructive">
                <code className="text-xs bg-destructive-tint px-1 py-0.5 rounded">
                  {t('apiKeys.encryptionRequiredDescription')}
                </code>
              </AlertDescription>
            </Alert>
          )}

          {/* Migration banner */}
          {encryptionReady && <MigrationBanner providersToMigrate={providersToMigrate} />}

          <div className="space-y-5">
            <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <span className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:inline">Quản lý hệ thống</span>
                <nav className="flex min-w-0 flex-1 gap-1" aria-label="Khu vực cài đặt">
                  <a href="#defaults" className="inline-flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs font-semibold text-foreground">
                    <IconAdjustmentsHorizontal className="h-4 w-4" />
                    Cấu hình mặc định
                  </a>
                  <a href="#providers" className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    <IconKey className="h-4 w-4" />
                    Nhà cung cấp AI
                  </a>
                </nav>
              </div>
              <div className="flex shrink-0 items-center gap-2 border-t pt-3 text-xs sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                <span className="h-2 w-2 rounded-full bg-foreground/60" />
                <span className="font-semibold">{configuredProviderCount > 0 ? 'Đang hoạt động' : 'Chưa kết nối'}</span>
                <span className="text-muted-foreground">· {configuredProviderCount}/{sortedProviders.length} provider</span>
              </div>
            </div>

            <div className="min-w-0 space-y-6">
          {/* Default Model Selectors */}
          {models && defaults && (
            <section id="defaults" className="scroll-mt-6 space-y-3">
              <button
                type="button"
                onClick={() => setShowDefaultModels(current => !current)}
                aria-expanded={showDefaultModels}
                className="group flex w-full items-center justify-between gap-4 rounded-lg border bg-card p-4 text-left transition-colors hover:border-foreground/25 hover:bg-muted/20"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                    <IconAdjustmentsHorizontal className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">Cấu hình mặc định</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      Điều phối model cho từng chức năng của NotebookE · {models.find(model => model.id === defaults.default_chat_model)?.name || 'Chưa chọn model trò chuyện'}
                    </span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs font-medium text-foreground">
                  {showDefaultModels ? 'Thu gọn' : 'Mở cấu hình'}
                  <IconChevronDown className={`h-4 w-4 transition-transform ${showDefaultModels ? 'rotate-180' : ''}`} />
                </span>
              </button>
              <Dialog open={showDefaultModels} onOpenChange={setShowDefaultModels}>
                <DialogContent variant="drawer" className="max-w-[min(100vw,42rem)]">
                  <div className="flex h-full flex-col">
                    <DialogHeader className="border-b bg-muted/20 px-6 py-5 pr-14">
                      <DialogTitle className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                          <IconAdjustmentsHorizontal className="h-4 w-4" />
                        </span>
                        Cấu hình model mặc định
                      </DialogTitle>
                      <DialogDescription>Chọn model cho từng chức năng. Thay đổi sẽ được lưu ngay.</DialogDescription>
                    </DialogHeader>
                    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                      <DefaultModelSelectors models={models} defaults={defaults} />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </section>
          )}

          {/* Provider Cards */}
          {providersError ? (
            <Alert variant="destructive">
              <IconAlertCircle className="h-4 w-4" />
              <AlertTitle>{t('apiKeys.providersLoadFailed')}</AlertTitle>
              <AlertDescription>{t('apiKeys.providersLoadFailedDescription')}</AlertDescription>
            </Alert>
          ) : (
            <>
            <section id="providers" className="scroll-mt-6 space-y-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">Kết nối AI</h2>
                <p className="text-xs text-muted-foreground">Quản lý API key và model theo từng nhà cung cấp.</p>
              </div>
              <span className="text-xs text-muted-foreground">{visibleProviders.length} provider hiển thị</span>
            </div>
            <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={providerQuery} onChange={event => setProviderQuery(event.target.value)} placeholder="Tìm provider hoặc tên cấu hình..." className="h-9 bg-background pl-9" />
              </div>
              <div className="flex shrink-0 gap-1 rounded-lg bg-background p-1">
                {([['all', 'Tất cả'], ['configured', 'Đã cấu hình'], ['available', 'Chưa cấu hình']] as const).map(([value, label]) => (
                  <Button key={value} type="button" variant={providerFilter === value ? 'secondary' : 'ghost'} size="sm" className="h-7 px-2.5 text-xs" onClick={() => setProviderFilter(value)}>{label}</Button>
                ))}
              </div>
            </div>

            {visibleProviders.length > 0 ? <div className="grid gap-4 xl:grid-cols-2">
              {visibleProviders.map(provider => (
                <ProviderSection
                  key={provider.name}
                  provider={provider}
                  credentials={credentialsByProvider[provider.name] || []}
                  models={models || []}
                  defaults={defaults || null}
                  allCredentials={credentials || []}
                  encryptionReady={encryptionReady}
                />
              ))}
            </div> : <div className="rounded-lg border border-dashed bg-card p-10 text-center"><IconX className="mx-auto h-5 w-5 text-muted-foreground" /><p className="mt-2 text-sm text-muted-foreground">Không tìm thấy provider phù hợp.</p></div>}
            </section>
            </>
          )}
          </div>

          {/* Help link */}
          <div className="border-t pt-4">
            <a
              href="https://github.com/lfnovo/notebooke/blob/main/docs/5-CONFIGURATION/ai-providers.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              {t('apiKeys.learnMore')}
            </a>
          </div>
        </div>
      </div>
      </div>
  )
}

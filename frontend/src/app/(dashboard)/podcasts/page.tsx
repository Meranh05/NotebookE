'use client'

import { useMemo, useState } from 'react'
import { IconAlertTriangle, IconHeadphones, IconMicrophone, IconLayout2 } from '@tabler/icons-react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { EpisodesTab } from '@/components/podcasts/EpisodesTab'
import { TemplatesTab } from '@/components/podcasts/TemplatesTab'
import { useTranslation } from '@/lib/hooks/use-translation'
import { useEpisodeProfiles, useSpeakerProfiles } from '@/lib/hooks/use-podcasts'
import { needsModelSetup } from '@/lib/types/podcasts'

export default function PodcastsPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'episodes' | 'templates'>('episodes')

  const { episodeProfiles } = useEpisodeProfiles()
  const { speakerProfiles } = useSpeakerProfiles(episodeProfiles)

  const hasUnconfiguredProfiles = useMemo(() => {
    return episodeProfiles.some(needsModelSetup) || speakerProfiles.some(needsModelSetup)
  }, [episodeProfiles, speakerProfiles])

  return (
      <div className="flex-1 overflow-y-auto bg-muted/20">
        <div className="mx-auto w-full max-w-[1480px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300">
                <IconHeadphones className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{t('podcasts.listTitle')}</h1>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  {t('podcasts.listDesc')}
                </p>
              </div>
            </div>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'episodes' | 'templates')} className="w-full lg:w-auto">
              <TabsList aria-label={t('common.accessibility.podcastViews')} className="grid h-9 w-full grid-cols-2 bg-muted/70 lg:w-[300px]">
                <TabsTrigger value="episodes" className="gap-2 rounded-md text-xs sm:text-sm"><IconMicrophone className="h-4 w-4 text-violet-600 dark:text-violet-300" />{t('podcasts.episodesTab')}</TabsTrigger>
                <TabsTrigger value="templates" className="gap-2 rounded-md text-xs sm:text-sm"><IconLayout2 className="h-4 w-4 text-slate-600 dark:text-slate-300" />{t('podcasts.templatesTab')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </header>

          {hasUnconfiguredProfiles ? (
            <Alert className="bg-warn-tint text-warn border-warn/30">
              <IconAlertTriangle className="h-4 w-4" />
              <AlertTitle>{t('podcasts.setupRequired')}</AlertTitle>
              <AlertDescription>
                {t('podcasts.setupRequiredDesc')}
              </AlertDescription>
            </Alert>
          ) : null}

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'episodes' | 'templates')}
            className="space-y-5"
          >
            <TabsContent value="episodes">
              <EpisodesTab />
            </TabsContent>

            <TabsContent value="templates">
              <TemplatesTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
  )
}

'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import type { Locale } from 'date-fns/locale'
import { IconArrowUpRight, IconBook2, IconChevronDown, IconChevronRight, IconFileSpreadsheet, IconFileText, IconFileZip, IconMusic, IconPhoto, IconPresentation, IconVideo } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { notebooksApi } from '@/lib/api/notebooks'
import type { RecentlyViewedResponse } from '@/lib/types/api'
import { useTranslation } from '@/lib/hooks/use-translation'
import { getDateLocale } from '@/lib/utils/date-locale'

interface RecentlyViewedProps {
  limit?: number
}

function getItemHref(item: RecentlyViewedResponse) {
  if (item.type === 'notebook') {
    return `/notebooks/${encodeURIComponent(item.id)}`
  }

  return `/sources/${item.id}`
}

function formatViewedAt(value: string, locale: Locale) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return formatDistanceToNow(date, {
    addSuffix: true,
    locale,
  })
}

const NOTEBOOK_ICON_TONES = [
  'border-indigo-100 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/35 dark:text-indigo-300',
  'border-teal-100 bg-teal-50 text-teal-700 dark:border-teal-900/60 dark:bg-teal-950/35 dark:text-teal-300',
  'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300',
  'border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-300',
  'border-sky-100 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-300',
  'border-orange-100 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/35 dark:text-orange-300',
  'border-cyan-100 bg-cyan-50 text-cyan-700 dark:border-cyan-900/60 dark:bg-cyan-950/35 dark:text-cyan-300',
  'border-lime-100 bg-lime-50 text-lime-700 dark:border-lime-900/60 dark:bg-lime-950/35 dark:text-lime-300',
  'border-fuchsia-100 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-900/60 dark:bg-fuchsia-950/35 dark:text-fuchsia-300',
  'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300',
]

const NOTEBOOK_SURFACE_TONES = [
  'bg-indigo-50/40 dark:bg-indigo-950/20', 'bg-teal-50/40 dark:bg-teal-950/20',
  'bg-amber-50/40 dark:bg-amber-950/20', 'bg-rose-50/40 dark:bg-rose-950/20',
  'bg-sky-50/40 dark:bg-sky-950/20', 'bg-orange-50/40 dark:bg-orange-950/20',
  'bg-cyan-50/40 dark:bg-cyan-950/20', 'bg-lime-50/40 dark:bg-lime-950/20',
  'bg-fuchsia-50/40 dark:bg-fuchsia-950/20', 'bg-emerald-50/40 dark:bg-emerald-950/20',
]

export function RecentlyViewed({ limit = 12 }: RecentlyViewedProps) {
  const { t, language } = useTranslation()
  const [isOpen, setIsOpen] = useState(true)
  const locale = getDateLocale(language)
  const { data: items, isLoading, isError } = useQuery({
    queryKey: ['recently-viewed', limit],
    queryFn: () => notebooksApi.recentlyViewed(limit),
  })

  if (isLoading || isError || !items || items.length === 0) {
    return null
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-3 rounded-2xl border border-border/80 bg-card p-3 shadow-sm sm:p-4">
      <div className="flex min-h-9 items-center gap-2 border-b border-border/70 pb-3">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg p-0">
            {isOpen ? (
              <IconChevronDown className="h-4 w-4" />
            ) : (
              <IconChevronRight className="h-4 w-4" />
            )}
            <span className="sr-only">
              {t('notebooks.toggleRecentlyViewed', {
                defaultValue: 'Toggle recently viewed',
              })}
            </span>
          </Button>
        </CollapsibleTrigger>
        <h2 className="font-display text-lg font-semibold tracking-tight">
          {t('notebooks.recentlyViewed', { defaultValue: 'Recently Viewed' })}
        </h2>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-semibold text-muted-foreground">{items.length}</span>
      </div>

      <CollapsibleContent>
        <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-3 2xl:grid-cols-4">
          {items.map((item) => {
            const isNotebook = item.type === 'notebook'
            let Icon = isNotebook ? IconBook2 : IconFileText
            let extText = ''
            let iconTone = isNotebook
              ? NOTEBOOK_ICON_TONES[[...(item.title || '')].reduce((sum, character) => sum + character.charCodeAt(0), 0) % NOTEBOOK_ICON_TONES.length]
              : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300'
            const notebookIndex = [...(item.title || '')].reduce((sum, character) => sum + character.charCodeAt(0), 0) % NOTEBOOK_SURFACE_TONES.length
            const surfaceTone = isNotebook ? NOTEBOOK_SURFACE_TONES[notebookIndex] : 'bg-card'

            if (!isNotebook) {
              const ext = (item.title || '').split('.').pop()?.toLowerCase() ?? ''
              
              if (['pdf'].includes(ext)) {
                Icon = IconFileText
                iconTone = 'border-red-100 bg-red-50 text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300'
              } else if (['doc', 'docx'].includes(ext)) {
                Icon = IconFileText
                iconTone = 'border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300'
              } else if (['xls', 'xlsx'].includes(ext)) {
                Icon = IconFileSpreadsheet
                iconTone = 'border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
              } else if (['ppt', 'pptx'].includes(ext)) {
                Icon = IconPresentation
                iconTone = 'border-orange-100 bg-orange-50 text-orange-600 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-300'
              } else if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext)) {
                Icon = IconPhoto
                iconTone = 'border-violet-100 bg-violet-50 text-violet-600 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-300'
              } else if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) {
                Icon = IconVideo
                iconTone = 'border-sky-100 bg-sky-50 text-sky-600 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300'
              } else if (['mp3', 'wav', 'm4a'].includes(ext)) {
                Icon = IconMusic
                iconTone = 'border-fuchsia-100 bg-fuchsia-50 text-fuchsia-600 dark:border-fuchsia-900/50 dark:bg-fuchsia-950/30 dark:text-fuchsia-300'
              } else if (['zip', 'rar', 'tar', 'gz'].includes(ext)) {
                Icon = IconFileZip
              } else {
                Icon = IconFileText
              }
              
              if (['pdf','doc','docx','xls','xlsx','ppt','pptx','jpg','jpeg','png','gif','svg','mp4','mov','avi','webm','mp3','wav','m4a','zip','rar','tar','gz'].includes(ext)) {
                extText = ext.toUpperCase().slice(0, 4)
              } else {
                extText = 'FILE'
              }
            }
            
            const typeLabel =
              item.type === 'notebook'
                ? t('notebooks.recentlyViewedNotebook', {
                    defaultValue: 'Notebook',
                  })
                : t('notebooks.recentlyViewedSource', {
                    defaultValue: 'Source',
                  })

            return (
              <Link
                key={`${item.type}-${item.id}`}
                href={getItemHref(item)}
                className={`group relative flex min-h-[66px] min-w-[260px] snap-start items-center gap-3 rounded-xl border border-border/80 px-3 py-2.5 shadow-sm transition-[border-color,box-shadow,background-color] duration-150 hover:border-border hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 sm:min-w-0 ${surfaceTone}`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-md border ${iconTone}`}
                >
                  {!isNotebook ? (
                    <>
                      <Icon className="h-4 w-4" />
                      <span className="mt-0.5 text-[7.5px] font-bold leading-none">
                        {extText}
                      </span>
                    </>
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex min-w-0 items-center gap-2">
                    <p className="truncate font-display text-[13px] font-semibold">{item.title}</p>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {typeLabel}
                    </span>
                    <span className="h-1 w-1 rounded-full bg-border" />
                    <p className="truncate text-[11px] text-muted-foreground/70">
                      {t('notebooks.lastViewed', {
                        time: formatViewedAt(item.last_viewed_at, locale),
                        defaultValue: 'Viewed {{time}}',
                      })}
                    </p>
                  </div>
                </div>
                <IconArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-foreground" />
              </Link>
            )
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

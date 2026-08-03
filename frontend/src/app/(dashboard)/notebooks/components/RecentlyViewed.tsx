'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import type { Locale } from 'date-fns/locale'
import { IconBook2, IconChevronDown, IconChevronRight, IconFileSpreadsheet, IconFileText, IconFileZip, IconMusic, IconPhoto, IconPresentation, IconVideo } from '@tabler/icons-react'

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
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-4">
      <div className="flex items-center gap-2">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
        <span className="text-sm text-muted-foreground">({items.length})</span>
      </div>

      <CollapsibleContent>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const isNotebook = item.type === 'notebook'
            let Icon = isNotebook ? IconBook2 : IconFileText
            let colorClass = isNotebook ? 'text-primary' : 'text-sage'
            let bgClass = isNotebook ? 'bg-primary/10' : 'bg-sage/10'
            let extText = ''

            if (!isNotebook) {
              const ext = (item.title || '').split('.').pop()?.toLowerCase() ?? ''
              
              if (['pdf'].includes(ext)) {
                Icon = IconFileText; colorClass = 'text-red-600 dark:text-red-400'; bgClass = 'bg-red-100 dark:bg-red-900/30'
              } else if (['doc', 'docx'].includes(ext)) {
                Icon = IconFileText; colorClass = 'text-blue-600 dark:text-blue-400'; bgClass = 'bg-blue-100 dark:bg-blue-900/30'
              } else if (['xls', 'xlsx'].includes(ext)) {
                Icon = IconFileSpreadsheet; colorClass = 'text-emerald-600 dark:text-emerald-400'; bgClass = 'bg-emerald-100 dark:bg-emerald-900/30'
              } else if (['ppt', 'pptx'].includes(ext)) {
                Icon = IconPresentation; colorClass = 'text-orange-600 dark:text-orange-400'; bgClass = 'bg-orange-100 dark:bg-orange-900/30'
              } else if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext)) {
                Icon = IconPhoto; colorClass = 'text-amber-600 dark:text-amber-400'; bgClass = 'bg-amber-100 dark:bg-amber-900/30'
              } else if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) {
                Icon = IconVideo; colorClass = 'text-purple-600 dark:text-purple-400'; bgClass = 'bg-purple-100 dark:bg-purple-900/30'
              } else if (['mp3', 'wav', 'm4a'].includes(ext)) {
                Icon = IconMusic; colorClass = 'text-pink-600 dark:text-pink-400'; bgClass = 'bg-pink-100 dark:bg-pink-900/30'
              } else if (['zip', 'rar', 'tar', 'gz'].includes(ext)) {
                Icon = IconFileZip; colorClass = 'text-gray-600 dark:text-gray-400'; bgClass = 'bg-gray-100 dark:bg-gray-800'
              } else {
                Icon = IconFileText; colorClass = 'text-slate-600 dark:text-slate-400'; bgClass = 'bg-slate-100 dark:bg-slate-800'
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
                className="group relative flex items-center gap-4 rounded-xl border border-border/80 bg-card px-4 py-3 transition-all duration-300 hover:bg-surface-raised hover:-translate-y-[1px] shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center transition-transform duration-300 group-hover:scale-110 ${isNotebook ? 'rounded-full' : 'rounded-xl'} ${bgClass}`}
                >
                  {!isNotebook ? (
                    <>
                      <Icon className={`h-4 w-4 ${colorClass}`} />
                      <span className={`text-[7.5px] font-bold leading-none mt-0.5 ${colorClass}`}>
                        {extText}
                      </span>
                    </>
                  ) : (
                    <Icon className={`h-5 w-5 ${colorClass}`} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2 mb-0.5">
                    <p className="truncate text-[14px] font-semibold font-display group-hover:text-primary transition-colors">{item.title}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="shrink-0 rounded-sm bg-background px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground shadow-sm">
                      {typeLabel}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <p className="truncate text-[11px] text-muted-foreground/70">
                      {t('notebooks.lastViewed', {
                        time: formatViewedAt(item.last_viewed_at, locale),
                        defaultValue: 'Viewed {{time}}',
                      })}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

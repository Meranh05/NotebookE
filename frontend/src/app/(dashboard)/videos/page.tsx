'use client'

import { VideoEpisodesTab } from '@/components/videos/VideoEpisodesTab'
import { IconVideo } from '@tabler/icons-react'

export default function VideosPage() {
  return (
      <div className="flex-1 overflow-y-auto bg-muted/20">
        <div className="mx-auto w-full max-w-[1480px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
          <header className="flex items-center gap-3 border-b pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300">
                  <IconVideo className="h-4 w-4" />
                </div>
                <div className="space-y-0.5">
                  <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Video AI</h1>
                  <p className="max-w-2xl text-sm text-muted-foreground">Quản lý, xem lại và chuyển đổi các video được tạo từ nội dung trong sổ tay.</p>
                </div>
              </div>
            </div>
          </header>

          <div className="space-y-6">
            <VideoEpisodesTab />
          </div>
        </div>
      </div>
  )
}

'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/hooks/use-translation'

export function GlobalQuotaListener() {
  const { t } = useTranslation()
  const lastToastTimeRef = useRef<number>(0)

  useEffect(() => {
    const handleQuotaExceeded = (event: Event) => {
      // Debounce to avoid spamming toasts if multiple requests fail at once (10 second cooldown)
      const now = Date.now()
      if (now - lastToastTimeRef.current < 10000) return
      
      lastToastTimeRef.current = now

      const customEvent = event as CustomEvent<{ message?: string }>
      
      // We can use generic translation keys for quota errors, falling back to specific text
      // if they haven't been added to locales yet
      const title = t('common.quotaErrorTitle', 'Hết Quota / Rate Limit (Quá tải)')
      const desc = t(
        'common.quotaErrorDesc', 
        'Hệ thống đang gọi một dịch vụ AI nhưng bị từ chối do hết hạn mức sử dụng (Quota) hoặc gửi quá nhiều yêu cầu (Rate Limit). Vui lòng kiểm tra lại API Key hoặc đợi một lúc rồi thử lại.'
      )

      toast.error(title, {
        description: desc,
        duration: 10000,
        action: {
          label: t('common.settings', 'Cài đặt'),
          onClick: () => {
            window.location.href = '/settings'
          }
        }
      })
    }

    window.addEventListener('quota-exceeded', handleQuotaExceeded)
    
    return () => {
      window.removeEventListener('quota-exceeded', handleQuotaExceeded)
    }
  }, [t])

  return null
}

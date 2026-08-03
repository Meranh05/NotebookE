'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { IconLanguage } from '@tabler/icons-react'
import { useTranslation } from '@/lib/hooks/use-translation'

interface LanguageToggleProps {
  iconOnly?: boolean
}

export function LanguageToggle({ iconOnly = false }: LanguageToggleProps) {
  const { language, setLanguage, t } = useTranslation()
  
  // Keep the actual language code for proper comparison
  const currentLang = language || 'en-US'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost"
          size={iconOnly ? "icon" : "default"} 
          className={iconOnly ? "h-10 w-full rounded-xl text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent" : "w-full justify-start gap-2.5 h-10 rounded-xl px-3 text-[14px] font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200"}
        >
          <IconLanguage className="h-[1.2rem] w-[1.2rem] opacity-70" />
          {!iconOnly && <span>{t('common.language')}</span>}
          <span className="sr-only">{t('navigation.language')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setLanguage('en-US')}
          className={currentLang === 'en-US' || currentLang.startsWith('en') ? 'bg-accent' : ''}
        >
          <span>{t('common.english')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage('ca-ES')}
          className={currentLang === 'ca-ES' || currentLang.startsWith('ca') ? 'bg-accent' : ''}
        >
          <span>{t('common.catalan')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setLanguage('zh-CN')}
          className={currentLang === 'zh-CN' || currentLang.startsWith('zh-Hans') || currentLang === 'zh' ? 'bg-accent' : ''}
        >
          <span>{t('common.chinese')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage('zh-TW')}
          className={currentLang === 'zh-TW' || currentLang.startsWith('zh-Hant') ? 'bg-accent' : ''}
        >
          <span>{t('common.traditionalChinese')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage('pt-BR')}
          className={currentLang === 'pt-BR' || currentLang.startsWith('pt') ? 'bg-accent' : ''}
        >
          <span>{t('common.portuguese')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage('ja-JP')}
          className={currentLang === 'ja-JP' || currentLang.startsWith('ja') ? 'bg-accent' : ''}
        >
          <span>{t('common.japanese')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage('fr-FR')}
          className={currentLang === 'fr-FR' || currentLang.startsWith('fr') ? 'bg-accent' : ''}
        >
          <span>{t('common.french')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage('ru-RU')}
          className={currentLang === 'ru-RU' || currentLang.startsWith('ru') ? 'bg-accent' : ''}
        >
          <span>{t('common.russian')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage('bn-IN')}
          className={currentLang === 'bn-IN' || currentLang.startsWith('bn') ? 'bg-accent' : ''}
        >
          <span>{t('common.bengali')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage('es-ES')}
          className={currentLang === 'es-ES' || currentLang.startsWith('es') ? 'bg-accent' : ''}
        >
          <span>{t('common.spanish')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage('de-DE')}
          className={currentLang === 'de-DE' || currentLang.startsWith('de') ? 'bg-accent' : ''}
        >
          <span>{t('common.german')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage('pl-PL')}
          className={currentLang === 'pl-PL' || currentLang.startsWith('pl') ? 'bg-accent' : ''}
        >
          <span>{t('common.polish')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage('tr-TR')}
          className={currentLang === 'tr-TR' || currentLang.startsWith('tr') ? 'bg-accent' : ''}
        >
          <span>{t('common.turkish')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage('vi-VN')}
          className={currentLang === 'vi-VN' || currentLang.startsWith('vi') ? 'bg-accent' : ''}
        >
          <span>Tiếng Việt</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

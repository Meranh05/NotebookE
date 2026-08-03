'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslation } from '@/lib/hooks/use-translation'
import { AppShell } from '@/components/layout/AppShell'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { IconAlertCircle, IconArrowUp, IconChevronDown, IconDeviceFloppy, IconMessageCircleQuestion, IconSearch, IconSettings, IconSquare } from '@tabler/icons-react'
import { useSearch } from '@/lib/hooks/use-search'
import { useAsk } from '@/lib/hooks/use-ask'
import { useModelDefaults, useModels } from '@/lib/hooks/use-models'
import { useModalManager } from '@/lib/hooks/use-modal-manager'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { StreamingResponse } from '@/components/search/StreamingResponse'
import { AdvancedModelsDialog } from '@/components/search/AdvancedModelsDialog'
import { SaveToNotebooksDialog } from '@/components/search/SaveToNotebooksDialog'

export default function SearchPage() {
  const { t } = useTranslation()
  // URL params
  const searchParams = useSearchParams()
  const urlQuery = searchParams?.get('q') || ''
  const rawMode = searchParams?.get('mode')
  const urlMode = rawMode === 'search' ? 'search' : 'ask'

  // Tab state (controlled)
  const [activeTab, setActiveTab] = useState<'ask' | 'search'>(
    urlMode === 'search' ? 'search' : 'ask'
  )

  // IconSearch state
  const [searchQuery, setSearchQuery] = useState(urlMode === 'search' ? urlQuery : '')
  const [searchType, setSearchType] = useState<'text' | 'vector'>('text')
  const [searchSources, setSearchSources] = useState(true)
  const [searchNotes, setSearchNotes] = useState(true)

  // Ask state
  const [askQuestion, setAskQuestion] = useState(urlMode === 'ask' ? urlQuery : '')

  // Advanced models dialog
  const [showAdvancedModels, setShowAdvancedModels] = useState(false)
  const [customModels, setCustomModels] = useState<{
    strategy: string
    answer: string
    finalAnswer: string
  } | null>(null)

  // IconDeviceFloppy to notebooks dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  // Hooks
  const searchMutation = useSearch()
  const ask = useAsk()
  const { data: modelDefaults, isLoading: modelsLoading } = useModelDefaults()
  const { data: availableModels } = useModels()
  const { openModal } = useModalManager()

  const modelNameById = useMemo(() => {
    if (!availableModels) {
      return new Map<string, string>()
    }
    return new Map(availableModels.map((model) => [model.id, model.name]))
  }, [availableModels])

  const resolveModelName = (id?: string | null) => {
    if (!id) return t('searchPage.notSet')
    return modelNameById.get(id) ?? id
  }

  const hasEmbeddingModel = !!modelDefaults?.default_embedding_model

  // Track if we've already auto-triggered from URL params
  const hasAutoTriggeredRef = useRef(false)
  const lastUrlParamsRef = useRef({ q: '', mode: '' })

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) return

    searchMutation.mutate({
      query: searchQuery,
      type: searchType,
      limit: 100,
      search_sources: searchSources,
      search_notes: searchNotes,
      minimum_score: 0.2
    })
  }, [searchQuery, searchType, searchSources, searchNotes, searchMutation])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleAsk = useCallback(() => {
    if (!askQuestion.trim() || !modelDefaults?.default_chat_model) return

    const models = customModels || {
      strategy: modelDefaults.default_chat_model,
      answer: modelDefaults.default_chat_model,
      finalAnswer: modelDefaults.default_chat_model
    }

    ask.sendAsk(askQuestion, models)
  }, [askQuestion, modelDefaults, customModels, ask])

  // Auto-trigger search/ask when arriving with URL params
  useEffect(() => {
    // Skip if already triggered or no query
    if (hasAutoTriggeredRef.current || !urlQuery) return

    // Wait for models to load before triggering ask
    if (urlMode === 'ask' && modelsLoading) return

    if (urlMode === 'search') {
      handleSearch()
      hasAutoTriggeredRef.current = true
    } else if (urlMode === 'ask' && modelDefaults?.default_chat_model) {
      handleAsk()
      hasAutoTriggeredRef.current = true
    }
  }, [urlQuery, urlMode, modelsLoading, modelDefaults, handleSearch, handleAsk])

  // Handle URL param changes while on page (e.g., from command palette again)
  useEffect(() => {
    const currentQ = searchParams?.get('q') || ''
    const rawCurrentMode = searchParams?.get('mode')
    const currentMode = rawCurrentMode === 'search' ? 'search' : 'ask'

    // Check if URL params have changed
    if (currentQ !== lastUrlParamsRef.current.q || currentMode !== lastUrlParamsRef.current.mode) {
      lastUrlParamsRef.current = { q: currentQ, mode: currentMode }

      if (currentQ) {
        // Update state based on mode
        if (currentMode === 'search') {
          setSearchQuery(currentQ)
          setActiveTab('search')
          // Reset trigger flag so we auto-trigger with new params
          hasAutoTriggeredRef.current = false
        } else {
          setAskQuestion(currentQ)
          setActiveTab('ask')
          hasAutoTriggeredRef.current = false
        }
      }
    }
  }, [searchParams])

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col items-center">
        <div className="w-full max-w-4xl space-y-8 mt-4 md:mt-10">
          <div className="text-center space-y-4 mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent pb-1">
              {t('searchPage.askAndSearch')}
            </h1>
            <p className="text-muted-foreground text-base max-w-2xl mx-auto">
              {t('searchPage.askYourKbDesc')}
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'ask' | 'search')} className="w-full flex flex-col items-center space-y-8">
            <TabsList aria-label={t('common.accessibility.searchKB')} className="grid w-full grid-cols-2 max-w-[400px]">
              <TabsTrigger value="ask" className="flex items-center gap-2">
                <IconMessageCircleQuestion className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">{t('searchPage.askBeta')}</span>
              </TabsTrigger>
              <TabsTrigger value="search" className="flex items-center gap-2">
                <IconSearch className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">{t('searchPage.search')}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ask" className="w-full mt-0 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-8">
                {/* Question Input */}
                <div className="relative group rounded-xl border bg-card focus-within:ring-1 focus-within:ring-ring transition-all flex flex-col overflow-hidden">
                  <Textarea
                    id="ask-question"
                    name="ask-question"
                    placeholder={t('searchPage.enterQuestionPlaceholder')}
                    value={askQuestion}
                    onChange={(e) => setAskQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      // Submit on Cmd/Ctrl+Enter
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !ask.isStreaming && askQuestion.trim()) {
                        e.preventDefault()
                        handleAsk()
                      }
                    }}
                    disabled={ask.isStreaming}
                    rows={4}
                    className="border-0 focus-visible:ring-0 resize-none shadow-none text-base md:text-lg p-6 min-h-[160px] bg-transparent placeholder:text-muted-foreground/60"
                    aria-label={t('common.accessibility.enterQuestion')}
                  />
                  
                  {/* Bottom Toolbar inside the input area */}
                  <div className="flex items-center justify-between p-4 pt-2 bg-gradient-to-t from-background to-transparent">
                    <div className="flex-1 flex flex-col gap-2">
                      <p className="text-xs text-muted-foreground ml-1">
                        {t('searchPage.pressToSubmit')}
                      </p>
                      
                      {/* Models Display */}
                      {!hasEmbeddingModel ? (
                        <div className="flex items-center gap-2 p-2 text-xs text-warn bg-warn-tint rounded-md w-fit">
                          <IconAlertCircle className="h-3 w-3" />
                          <span>{t('searchPage.noEmbeddingModel')}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAdvancedModels(true)}
                            disabled={ask.isStreaming}
                            className="h-6 py-0 px-2 text-xs hover:bg-muted"
                            title={customModels ? t('searchPage.usingCustomModels') : t('searchPage.usingDefaultModels')}
                          >
                            <IconSettings className="h-3 w-3 mr-1.5" />
                            {t('searchPage.advanced')}
                          </Button>
                          <div className="flex gap-1.5 flex-wrap">
                            <Badge variant="secondary" className="font-mono text-[10px] bg-muted/50 font-normal border-transparent">
                              {t('searchPage.strategy')}: {resolveModelName(customModels?.strategy || modelDefaults?.default_chat_model)}
                            </Badge>
                            <Badge variant="secondary" className="font-mono text-[10px] bg-muted/50 font-normal border-transparent">
                              {t('searchPage.answer')}: {resolveModelName(customModels?.answer || modelDefaults?.default_chat_model)}
                            </Badge>
                            <Badge variant="secondary" className="font-mono text-[10px] bg-muted/50 font-normal border-transparent">
                              {t('searchPage.final')}: {resolveModelName(customModels?.finalAnswer || modelDefaults?.default_chat_model)}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {ask.finalAnswer && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowSaveDialog(true)}
                          className="h-9"
                        >
                          <IconDeviceFloppy className="h-4 w-4 sm:mr-1.5" />
                          <span className="hidden sm:inline">{t('searchPage.saveToNotebooks')}</span>
                        </Button>
                      )}
                      
                      {hasEmbeddingModel && (
                        ask.isStreaming ? (
                          <Button
                            onClick={() => ask.cancel()}
                            size="icon"
                            variant="default"
                            className="h-10 w-10 rounded-xl rounded-tr-sm rounded-br-2xl shadow-md hover:scale-105 transition-all bg-foreground text-background hover:bg-foreground/90"
                            aria-label={t('searchPage.stop')}
                          >
                            <IconSquare className="h-4 w-4 fill-current" />
                          </Button>
                        ) : (
                          <Button
                            onClick={handleAsk}
                            disabled={!askQuestion.trim()}
                            size="icon"
                            className="h-10 w-10 rounded-xl rounded-tr-sm rounded-br-2xl shadow-md hover:scale-105 hover:shadow-lg transition-all"
                            aria-label={t('searchPage.ask')}
                          >
                            <IconArrowUp className="h-5 w-5" />
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* Streaming Response */}
                <StreamingResponse
                  isStreaming={ask.isStreaming}
                  strategy={ask.strategy}
                  answers={ask.answers}
                  finalAnswer={ask.finalAnswer}
                />

                {/* Advanced Models Dialog */}
                <AdvancedModelsDialog
                  open={showAdvancedModels}
                  onOpenChange={setShowAdvancedModels}
                  defaultModels={{
                    strategy: customModels?.strategy || modelDefaults?.default_chat_model || '',
                    answer: customModels?.answer || modelDefaults?.default_chat_model || '',
                    finalAnswer: customModels?.finalAnswer || modelDefaults?.default_chat_model || ''
                  }}
                  onSave={setCustomModels}
                />

                {/* IconDeviceFloppy to Notebooks Dialog */}
                {ask.finalAnswer && (
                  <SaveToNotebooksDialog
                    open={showSaveDialog}
                    onOpenChange={setShowSaveDialog}
                    question={askQuestion}
                    answer={ask.finalAnswer}
                  />
                )}
              </div>
          </TabsContent>

          <TabsContent value="search" className="w-full mt-0 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-8">
              <div className="space-y-4">
                {/* IconSearch Input */}
                <div className="space-y-2">
                  <Label htmlFor="search-query" className="sr-only">
                    {t('searchPage.search')}
                  </Label>
                  <div className="relative rounded-xl border bg-background shadow-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all flex items-center p-1">
                    <div className="flex-1 flex items-center px-2">
                      <IconSearch className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                      <Input
                        id="search-query"
                        name="search-query"
                        placeholder={t('searchPage.enterSearchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={searchMutation.isPending}
                        className="border-0 focus-visible:ring-0 shadow-none text-base h-12 w-full bg-transparent"
                        aria-label={t('common.accessibility.enterSearch')}
                        autoComplete="off"
                      />
                    </div>
                    <Button
                      onClick={handleSearch}
                      disabled={searchMutation.isPending || !searchQuery.trim()}
                      aria-label={t('common.accessibility.searchKBBtn')}
                      size="sm"
                      className="h-10 px-6 shrink-0 rounded-lg font-medium"
                    >
                      {searchMutation.isPending ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        t('searchPage.search')
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground ml-1">{t('searchPage.pressToSearch')}</p>
                </div>

                {/* IconSearch Options */}
                <div className="space-y-4">
                  {/* IconSearch Type */}
                  <div className="space-y-2" role="group" aria-labelledby="search-type-label">
                    <span id="search-type-label" className="text-sm font-medium leading-none">{t('searchPage.searchType')}</span>
                    {!hasEmbeddingModel && (
                      <div className="flex items-center gap-2 text-sm text-warn">
                        <IconAlertCircle className="h-4 w-4" />
                        <span>{t('searchPage.vectorSearchWarning')}</span>
                      </div>
                    )}
                    <RadioGroup
                      name="search-type"
                      value={searchType}
                      onValueChange={(value: 'text' | 'vector') => setSearchType(value)}
                      disabled={modelsLoading || searchMutation.isPending}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="text" id="text" />
                        <Label htmlFor="text" className="font-normal cursor-pointer">
                          {t('searchPage.textSearch')}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="vector"
                          id="vector"
                          disabled={!hasEmbeddingModel || searchMutation.isPending}
                        />
                        <Label
                          htmlFor="vector"
                          className={`font-normal ${!hasEmbeddingModel ? 'text-muted-foreground cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {t('searchPage.vectorSearch')}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* IconSearch Locations */}
                  <div className="space-y-2" role="group" aria-labelledby="search-in-label">
                    <span id="search-in-label" className="text-sm font-medium leading-none">{t('searchPage.searchIn')}</span>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="sources"
                          name="sources"
                          checked={searchSources}
                          onCheckedChange={(checked) => setSearchSources(checked as boolean)}
                          disabled={searchMutation.isPending}
                        />
                        <Label htmlFor="sources" className="font-normal cursor-pointer">
                          {t('searchPage.searchSources')}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="notes"
                          name="notes"
                          checked={searchNotes}
                          onCheckedChange={(checked) => setSearchNotes(checked as boolean)}
                          disabled={searchMutation.isPending}
                        />
                        <Label htmlFor="notes" className="font-normal cursor-pointer">
                          {t('searchPage.searchNotes')}
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* IconSearch Results */}
                {searchMutation.data && (
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">
                        {t('searchPage.resultsFound', { count: searchMutation.data.total_count })}
                      </h3>
                      <Badge variant="outline">{searchMutation.data.search_type === 'text' ? t('searchPage.textSearch') : t('searchPage.vectorSearch')}</Badge>
                    </div>

                    {searchMutation.data.results.length === 0 ? (
                      <Card>
                        <CardContent className="pt-6 text-center text-muted-foreground">
                          {t('searchPage.noResultsFor', { query: searchQuery })}
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-2">
                        {searchMutation.data.results.map((result, index) => {
                          // Parse type from parent_id (format: "source:id" or "note:id" or "source_insight:id")
                          // Handle null parent_id gracefully (orphaned records)
                          if (!result.parent_id) {
                            console.warn('IconSearch result with null parent_id:', result)
                            return null
                          }
                          const [type, id] = result.parent_id.split(':')
                          const modalType = type === 'source_insight' ? 'insight' : type as 'source' | 'note' | 'insight'

                          return (
                          <Card key={index} className="transition-shadow hover:shadow-lift">
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <button
                                    onClick={() => openModal(modalType, id)}
                                    className="text-primary hover:underline font-medium"
                                  >
                                    {result.title}
                                  </button>
                                  <Badge variant="secondary" className="ml-2 font-mono text-[11px]">
                                    {result.final_score.toFixed(2)}
                                  </Badge>
                                </div>
                              </div>

                              {result.matches && result.matches.length > 0 && (
                                <Collapsible className="mt-3">
                                  <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                                    <IconChevronDown className="h-4 w-4" />
                                    {t('searchPage.matches', { count: result.matches.length })}
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="mt-2 space-y-1">
                                    {result.matches.map((match, i) => (
                                      <div key={i} className="text-sm pl-6 py-1 border-l-2 border-muted">
                                        {match}
                                      </div>
                                    ))}
                                  </CollapsibleContent>
                                </Collapsible>
                              )}
                            </CardContent>
                          </Card>
                        )})}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </AppShell>
  )
}

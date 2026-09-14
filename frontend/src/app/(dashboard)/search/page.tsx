'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslation } from '@/lib/hooks/use-translation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
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
      <div className="flex-1 flex flex-col relative h-full">
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-[250px] flex flex-col items-center">
          <div className="w-full max-w-4xl mt-4 md:mt-8">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'ask' | 'search')} className="w-full flex flex-col">
              <div className="mb-8 flex w-full flex-col gap-5 rounded-2xl border border-border/80 bg-card p-5 shadow-sm md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
                    {t('searchPage.askAndSearch')}
                  </h1>
                  <p className="text-muted-foreground text-sm max-w-md leading-relaxed">
                    {t('searchPage.askYourKbDesc')}
                  </p>
                </div>

                <TabsList aria-label={t('common.accessibility.searchKB')} className="grid h-10 w-full shrink-0 grid-cols-2 rounded-xl bg-muted/60 p-1 md:w-[300px]">
                  <TabsTrigger value="ask" className="flex h-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium text-muted-foreground transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                    <IconMessageCircleQuestion className="h-4 w-4 text-teal-600 dark:text-teal-300" />
                    <span>{t('searchPage.askBeta')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="search" className="flex h-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium text-muted-foreground transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                    <IconSearch className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                    <span>{t('searchPage.search')}</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="ask" className="w-full mt-0 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-6">
                  {!ask.isStreaming && !ask.finalAnswer && !ask.strategy && (
                    <Card className="overflow-hidden rounded-2xl border-border/80 bg-card/60 shadow-sm">
                      <CardContent className="flex flex-col items-center px-6 py-6 text-center sm:py-8">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-100 bg-teal-50 text-teal-700 shadow-sm dark:border-teal-900/60 dark:bg-teal-950/30 dark:text-teal-300">
                          <IconMessageCircleQuestion className="h-7 w-7" />
                        </div>
                        <h2 className="font-display text-xl font-semibold tracking-tight">{t('searchPage.askYourKb')}</h2>
                        <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{t('searchPage.askYourKbDesc')}</p>
                      </CardContent>
                    </Card>
                  )}
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

              <TabsContent value="search" className="w-full mt-0 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-8">
                  {/* IconSearch Options */}
                  <div className="flex flex-col gap-6 rounded-2xl border border-border/80 bg-card/70 p-5 shadow-sm sm:flex-row sm:items-start">
                    {/* IconSearch Type */}
                    <div className="space-y-3 flex-1" role="group" aria-labelledby="search-type-label">
                      <span id="search-type-label" className="text-sm font-semibold">{t('searchPage.searchType')}</span>
                      {!hasEmbeddingModel && (
                        <div className="flex items-center gap-2 text-xs text-warn">
                          <IconAlertCircle className="h-3.5 w-3.5" />
                          <span>{t('searchPage.vectorSearchWarning')}</span>
                        </div>
                      )}
                      <RadioGroup
                        name="search-type"
                        value={searchType}
                        onValueChange={(value: 'text' | 'vector') => setSearchType(value)}
                        disabled={modelsLoading || searchMutation.isPending}
                        className="flex flex-col gap-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="text" id="text" />
                          <Label htmlFor="text" className="font-normal cursor-pointer text-sm">
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
                            className={`font-normal text-sm ${!hasEmbeddingModel ? 'text-muted-foreground cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            {t('searchPage.vectorSearch')}
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* IconSearch Locations */}
                    <div className="space-y-3 flex-1" role="group" aria-labelledby="search-in-label">
                      <span id="search-in-label" className="text-sm font-semibold">{t('searchPage.searchIn')}</span>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="sources"
                            name="sources"
                            checked={searchSources}
                            onCheckedChange={(checked) => setSearchSources(checked as boolean)}
                            disabled={searchMutation.isPending}
                          />
                          <Label htmlFor="sources" className="font-normal cursor-pointer text-sm">
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
                          <Label htmlFor="notes" className="font-normal cursor-pointer text-sm">
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
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Fixed Input Area at Bottom */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center border-t border-border/80 bg-background/95 px-4 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.04)] backdrop-blur-sm md:px-6 dark:shadow-[0_-8px_24px_rgba(0,0,0,0.16)]">
          <div className="w-full max-w-4xl pointer-events-auto">
            
            {activeTab === 'ask' && (
              <div className="flex flex-col gap-2">
                {!hasEmbeddingModel && (
                  <div className="mx-auto flex w-fit items-center gap-2 rounded-md border border-warn/30 bg-warn-tint px-3 py-2 text-xs text-warn">
                    <IconAlertCircle className="h-3.5 w-3.5" />
                    <span>{t('searchPage.noEmbeddingModel')}</span>
                  </div>
                )}
                
                <div className="relative flex items-center overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-sm transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
                  <div className="flex items-center gap-1 pl-1 md:pl-2 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => setShowAdvancedModels(true)} className="h-9 w-9 rounded-md text-muted-foreground hover:text-foreground" title={t('searchPage.advanced')}>
                      <IconSettings className="h-5 w-5" />
                    </Button>
                  </div>

                  <Textarea
                    id="ask-question"
                    value={askQuestion}
                    onChange={(e) => setAskQuestion(e.target.value)}
                    placeholder={t('searchPage.enterQuestionPlaceholder')}
                    className="flex-1 border-0 focus-visible:ring-0 resize-none shadow-none text-base bg-transparent min-h-[52px] max-h-[160px] py-4 px-3 md:px-4 placeholder:text-muted-foreground/60"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !ask.isStreaming && askQuestion.trim()) {
                        e.preventDefault()
                        handleAsk()
                      }
                    }}
                    disabled={ask.isStreaming}
                  />

                  <div className="flex items-center gap-1.5 pr-1 shrink-0">
                    {ask.finalAnswer && (
                      <Button variant="ghost" size="icon" onClick={() => setShowSaveDialog(true)} className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground transition-colors" title={t('searchPage.saveToNotebooks')}>
                        <IconDeviceFloppy className="h-5 w-5" />
                      </Button>
                    )}
                    
                    <Button
                      onClick={ask.isStreaming ? () => ask.cancel() : handleAsk}
                      disabled={!ask.isStreaming && !askQuestion.trim()}
                      size="icon"
                      className="h-11 w-11 rounded-full bg-foreground text-background hover:bg-foreground/90 hover:scale-105 active:scale-95 transition-all shadow-md ml-1 disabled:opacity-40 disabled:hover:scale-100"
                    >
                      {ask.isStreaming ? <IconSquare className="h-4 w-4 fill-current" /> : <IconArrowUp className="h-5 w-5" />}
                    </Button>
                  </div>
                </div>

                {hasEmbeddingModel && (
                  <div className="flex gap-4 justify-center px-4 pt-3 opacity-60 hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium tracking-wide uppercase text-muted-foreground">
                      <span className="opacity-70">{t('searchPage.strategy')}</span>
                      <span className="text-foreground/80">{resolveModelName(customModels?.strategy || modelDefaults?.default_chat_model)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-medium tracking-wide uppercase text-muted-foreground">
                      <span className="opacity-70">{t('searchPage.answer')}</span>
                      <span className="text-foreground/80">{resolveModelName(customModels?.answer || modelDefaults?.default_chat_model)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-medium tracking-wide uppercase text-muted-foreground">
                      <span className="opacity-70">{t('searchPage.final')}</span>
                      <span className="text-foreground/80">{resolveModelName(customModels?.finalAnswer || modelDefaults?.default_chat_model)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'search' && (
              <div className="relative flex items-center overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-sm transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
                <div className="flex items-center pl-4 pr-2 shrink-0 text-muted-foreground">
                  <IconSearch className="h-5 w-5" />
                </div>

                <Input
                  id="search-query"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchPage.enterSearchPlaceholder')}
                  className="flex-1 border-0 focus-visible:ring-0 shadow-none text-base bg-transparent h-[52px] px-2 md:px-3 placeholder:text-muted-foreground/60"
                  onKeyPress={handleKeyPress}
                  disabled={searchMutation.isPending}
                  autoComplete="off"
                />

                <div className="flex items-center gap-1.5 pr-1 shrink-0">
                  <Button
                    onClick={handleSearch}
                    disabled={searchMutation.isPending || !searchQuery.trim()}
                    size="icon"
                    className="h-11 w-11 rounded-full bg-foreground text-background hover:bg-foreground/90 hover:scale-105 active:scale-95 transition-all shadow-md ml-1 disabled:opacity-40 disabled:hover:scale-100"
                  >
                    {searchMutation.isPending ? <LoadingSpinner size="sm" /> : <IconArrowUp className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
  )
}

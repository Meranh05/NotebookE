'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { IconBulb, IconChevronDown, IconCircleCheck, IconSparkles } from '@tabler/icons-react'
import { useState } from 'react'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { convertReferencesToMarkdownLinks, createReferenceLinkComponent } from '@/lib/utils/source-references'
import { useModalManager } from '@/lib/hooks/use-modal-manager'
import { useTranslation } from '@/lib/hooks/use-translation'
import { toast } from 'sonner'

interface StrategyData {
  reasoning: string
  searches: Array<{ term: string; instructions: string }>
}

interface StreamingResponseProps {
  isStreaming: boolean
  strategy: StrategyData | null
  answers: string[]
  finalAnswer: string | null
}

export function StreamingResponse({
  isStreaming,
  strategy,
  answers,
  finalAnswer
}: StreamingResponseProps) {
  const [strategyOpen, setStrategyOpen] = useState(false)
  const [answersOpen, setAnswersOpen] = useState(false)
  const { openModal } = useModalManager()
  const { t } = useTranslation()

  const handleReferenceClick = (type: string, id: string) => {
    const modalType = type === 'source_insight' ? 'insight' : type as 'source' | 'note' | 'insight'

    try {
      openModal(modalType, id)
      // Note: The modal system uses URL parameters and doesn't throw errors for missing items.
      // The modal component itself will handle displaying "not found" states.
      // This try-catch is here for future enhancements or unexpected errors.
    } catch {
      const typeLabel = type === 'source_insight' ? 'insight' : type
      toast.error(t('common.itemNotFound', { type: typeLabel }))
    }
  }

  if (!strategy && !answers.length && !finalAnswer && !isStreaming) {
    return null
  }

  return (
    <div
      className="space-y-3 mt-4"
      role="region"
      aria-label={t('common.accessibility.askResponse')}
      aria-live="polite"
      aria-busy={isStreaming}
    >
      {/* Strategy Section - Collapsible */}
      {strategy && (
        <Collapsible open={strategyOpen} onOpenChange={setStrategyOpen}>
          <Card className="shadow-none border-muted-foreground/20">
            <CardHeader className="p-4 py-3">
              <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <IconSparkles className="h-4 w-4 text-teal" />
                  {t('common.strategy')}
                </CardTitle>
                <IconChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${strategyOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-3 px-4 pb-4 pt-0">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">{t('common.reasoning')}:</p>
                  <p className="text-sm">{strategy.reasoning}</p>
                </div>
                {strategy.searches.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">{t('common.searchTerms')}:</p>
                    <div className="space-y-1.5">
                      {strategy.searches.map((search, i) => (
                        <div key={i} className="flex items-start gap-2 bg-muted/50 p-2 rounded-md">
                          <Badge variant="outline" className="mt-0.5 font-mono text-[10px] h-4 min-w-4 flex items-center justify-center p-0">{i + 1}</Badge>
                          <div className="flex-1">
                            <p className="text-sm font-medium leading-tight">{search.term}</p>
                            {search.instructions && <p className="text-xs text-muted-foreground mt-0.5">{search.instructions}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Individual Answers Section - Collapsible */}
      {answers.length > 0 && (
        <Collapsible open={answersOpen} onOpenChange={setAnswersOpen}>
          <Card className="shadow-none border-muted-foreground/20">
            <CardHeader className="p-4 py-3">
              <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <IconBulb className="h-4 w-4 text-amber-500" />
                  {t('common.individualAnswers', { count: answers.length })}
                </CardTitle>
                <IconChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${answersOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-3 px-4 pb-4 pt-0">
                {answers.map((answer, i) => (
                  <div key={i} className="p-3 rounded-md bg-muted/30 text-sm overflow-x-auto">
                    <MarkdownRenderer>
                      {answer}
                    </MarkdownRenderer>
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Final Answer Section - Always Open */}
      {finalAnswer && (
        <Card className="border-teal shadow-sm">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <IconCircleCheck className="h-5 w-5 text-teal" />
              {t('common.finalAnswer')}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <FinalAnswerContent
              content={finalAnswer}
              onReferenceClick={handleReferenceClick}
            />
          </CardContent>
        </Card>
      )}

      {/* Loading Indicator */}
      {isStreaming && !finalAnswer && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <LoadingSpinner size="sm" />
          <span>{t('searchPage.processingQuestion')}</span>
        </div>
      )}
    </div>
  )
}

// Helper component to render final answer with clickable references
function FinalAnswerContent({
  content,
  onReferenceClick
}: {
  content: string
  onReferenceClick: (type: string, id: string) => void
}) {
  // Convert references to markdown links
  const markdownWithLinks = convertReferencesToMarkdownLinks(content)

  // Create custom link component
  const LinkComponent = createReferenceLinkComponent(onReferenceClick)

  return (
    <MarkdownRenderer components={{
      a: LinkComponent
    }}>
      {markdownWithLinks}
    </MarkdownRenderer>
  )
}

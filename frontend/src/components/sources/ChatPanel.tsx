'use client'

import { memo, useCallback, useState, useRef, useEffect, useId } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { IconBulb, IconClock, IconFileText, IconLoader2, IconNote, IconSend, IconSquare, IconUser } from '@tabler/icons-react'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import {
  SourceChatMessage,
  SourceChatContextIndicator,
  BaseChatSession
} from '@/lib/types/api'
import { ModelSelector } from './ModelSelector'
import { ContextIndicator } from '@/components/common/ContextIndicator'
import { SessionManager } from '@/components/sources/SessionManager'
import { MessageActions } from '@/components/sources/MessageActions'
import { convertReferencesToCompactMarkdown, createCompactReferenceLinkComponent } from '@/lib/utils/source-references'
import { useModalManager } from '@/lib/hooks/use-modal-manager'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/hooks/use-translation'

interface NotebookContextStats {
  sourcesInsights: number
  sourcesFull: number
  notesCount: number
  tokenCount?: number
  charCount?: number
}

interface ChatPanelProps {
  messages: SourceChatMessage[]
  isStreaming: boolean
  contextIndicators: SourceChatContextIndicator | null
  onSendMessage: (message: string, modelOverride?: string) => void
  onCancelStreaming?: () => void
  modelOverride?: string
  onModelChange?: (model?: string) => void
  // Session management props
  sessions?: BaseChatSession[]
  currentSessionId?: string | null
  onCreateSession?: (title: string) => void
  onSelectSession?: (sessionId: string) => void
  onDeleteSession?: (sessionId: string) => void
  onUpdateSession?: (sessionId: string, title: string) => void
  loadingSessions?: boolean
  // Generic props for reusability
  title?: string
  contextType?: 'source' | 'notebook'
  // Notebook context stats (for notebook chat)
  notebookContextStats?: NotebookContextStats
  // Notebook ID for saving notes
  notebookId?: string
}

export function ChatPanel({
  messages,
  isStreaming,
  contextIndicators,
  onSendMessage,
  onCancelStreaming,
  modelOverride,
  onModelChange,
  sessions = [],
  currentSessionId,
  onCreateSession,
  onSelectSession,
  onDeleteSession,
  onUpdateSession,
  loadingSessions = false,
  title,
  contextType = 'source',
  notebookContextStats,
  notebookId
}: ChatPanelProps) {
  const { t } = useTranslation()
  const [sessionManagerOpen, setSessionManagerOpen] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { openModal } = useModalManager()

  // Stable reference-click handler so memoized messages don't re-render on
  // composer keystrokes (which no longer re-render this component at all, since
  // the input state lives in the ChatComposer child).
  const handleReferenceClick = useCallback((type: string, id: string) => {
    const modalType = type === 'source_insight' ? 'insight' : type as 'source' | 'note' | 'insight'

    try {
      openModal(modalType, id)
      // Note: The modal system uses URL parameters and doesn't throw errors for missing items.
      // The modal component itself will handle displaying "not found" states.
      // This try-catch is here for future enhancements or unexpected errors.
    } catch {
      toast.error(t('common.noResults'))
    }
  }, [openModal, t])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: isStreaming ? 'auto' : 'smooth' })
  }, [messages, isStreaming])

  return (
    <>
      <Card className="flex h-full flex-1 flex-col gap-0 overflow-hidden border-border bg-card p-0">
        <CardHeader className="px-4 py-2.5 flex-shrink-0 border-b border-border/40 !pb-2.5">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground">
              <span aria-hidden className="h-3.5 w-0.5 rounded-full bg-foreground/50" />
              {title || (contextType === 'source' ? t('chat.chatWith', { name: t('navigation.sources') }) : t('chat.chatWith', { name: t('common.notebook') }))}
            </CardTitle>
            {onSelectSession && onCreateSession && onDeleteSession && (
              <Dialog open={sessionManagerOpen} onOpenChange={setSessionManagerOpen}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground h-8 -mr-2"
                  onClick={() => setSessionManagerOpen(true)}
                  disabled={loadingSessions}
                >
                  <IconClock className="h-4 w-4" />
                  <span className="text-xs">{t('chat.sessions')}</span>
                </Button>
                <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden">
                  <DialogTitle className="sr-only">{t('chat.sessionsTitle')}</DialogTitle>
                  <SessionManager
                    sessions={sessions}
                    currentSessionId={currentSessionId ?? null}
                    onCreateSession={(title) => onCreateSession?.(title)}
                    onSelectSession={(sessionId) => {
                      onSelectSession(sessionId)
                      setSessionManagerOpen(false)
                    }}
                    onUpdateSession={(sessionId, title) => onUpdateSession?.(sessionId, title)}
                    onDeleteSession={(sessionId) => onDeleteSession?.(sessionId)}
                    loadingSessions={loadingSessions}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 p-0">
          <ScrollArea className="chat-scroll-area flex-1 min-h-0 px-4" ref={scrollAreaRef}>
            <div className="space-y-4 pt-2 pb-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border bg-muted">
                    <Image src="/logo.svg" alt="NotebookE AI" width={44} height={44} className="dark:invert" />
                  </div>
                  <p className="text-sm">
                    {t('chat.startConversation', { type: contextType === 'source' ? t('navigation.sources') : t('common.notebook') })}
                  </p>
                  <p className="text-xs mt-2">{t('chat.askQuestions')}</p>
                </div>
              ) : (
                messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    notebookId={notebookId}
                    onReferenceClick={handleReferenceClick}
                  />
                ))
              )}
              {isStreaming && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-card">
                      <Image src="/logo.svg" alt="NotebookE AI" width={22} height={22} className="dark:invert" />
                    </div>
                  </div>
                  <div className="rounded-lg px-4 py-2 bg-card border">
                    <IconLoader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <ChatComposer
            onSendMessage={onSendMessage}
            onCancelStreaming={onCancelStreaming}
            isStreaming={isStreaming}
            modelOverride={modelOverride}
            onModelChange={onModelChange}
            contextIndicators={contextIndicators}
            notebookContextStats={notebookContextStats}
          />
        </CardContent>
      </Card>

    </>
  )
}

// Composer owns the input state so keystrokes (including IME composition) only
// re-render this small component instead of the whole message history.
interface ChatComposerProps {
  onSendMessage: (message: string, modelOverride?: string) => void
  onCancelStreaming?: () => void
  isStreaming: boolean
  modelOverride?: string
  onModelChange?: (model?: string) => void
  contextIndicators?: {
    sources?: string[]
    insights?: string[]
    notes?: string[]
  } | null
  notebookContextStats?: {
    sourcesInsights: number
    sourcesFull: number
    notesCount: number
    tokenCount?: number
    charCount?: number
  }
}

function ChatComposer({
  onSendMessage,
  onCancelStreaming,
  isStreaming,
  modelOverride,
  onModelChange,
  contextIndicators,
  notebookContextStats
}: ChatComposerProps) {
  const { t } = useTranslation()
  const chatInputId = useId()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [input, setInput] = useState('')

  const handleSend = () => {
    if (input.trim() && !isStreaming) {
      onSendMessage(input.trim(), modelOverride)
      setInput('')
      if (textareaRef.current) {
        textareaRef.current.style.height = '68px'
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Detect platform for correct modifier key
    const isMac = typeof navigator !== 'undefined' && navigator.userAgent.toUpperCase().indexOf('MAC') >= 0
    const isModifierPressed = isMac ? e.metaKey : e.ctrlKey

    if (e.key === 'Enter' && isModifierPressed) {
      e.preventDefault()
      handleSend()
    }
  }

  // Detect platform for placeholder text
  const isMac = typeof navigator !== 'undefined' && navigator.userAgent.toUpperCase().indexOf('MAC') >= 0
  const keyHint = isMac ? '⌘+Enter' : 'Ctrl+Enter'

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // Auto-resize logic
    const target = e.target
    target.style.height = 'inherit'
    target.style.height = `${Math.min(target.scrollHeight, 250)}px`
  }

  return (
    <div className="flex-shrink-0 border-t bg-background px-3 pb-3 pt-2.5">
      <div className="overflow-hidden rounded-[22px] border border-border/80 bg-card shadow-[0_2px_10px_rgba(0,0,0,0.06)] transition-[border-color,box-shadow] focus-within:border-foreground/25 focus-within:shadow-[0_4px_18px_rgba(0,0,0,0.09)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.22)] dark:focus-within:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        <Textarea
          id={chatInputId}
          ref={textareaRef}
          name="chat-message"
          autoComplete="off"
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={t('chat.sendPlaceholder')}
          disabled={isStreaming}
          className="min-h-[68px] max-h-[250px] w-full resize-none rounded-none border-0 bg-transparent px-4 pb-2 pt-3.5 text-sm leading-relaxed shadow-none focus-visible:ring-0 md:px-4.5"
          rows={2}
          style={{ height: '68px' }}
        />

        <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 px-2.5 pb-2.5 pt-1">
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            {notebookContextStats && (
              <ContextIndicator
                sourcesInsights={notebookContextStats.sourcesInsights}
                sourcesFull={notebookContextStats.sourcesFull}
                notesCount={notebookContextStats.notesCount}
                tokenCount={notebookContextStats.tokenCount}
                charCount={notebookContextStats.charCount}
              className="min-w-0 border-none bg-transparent p-0"
              />
            )}
            {contextIndicators && !notebookContextStats && (
              <div className="flex min-w-0 flex-wrap gap-1.5 text-xs">
                {(contextIndicators.sources?.length ?? 0) > 0 && (
                  <Badge variant="secondary" className="h-7 gap-1.5 rounded-md px-2 font-normal">
                    <IconFileText className="h-3 w-3" />
                    {contextIndicators.sources!.length} {t('navigation.sources')}
                  </Badge>
                )}
                {(contextIndicators.insights?.length ?? 0) > 0 && (
                  <Badge variant="secondary" className="h-7 gap-1.5 rounded-md px-2 font-normal">
                    <IconBulb className="h-3 w-3" />
                    {contextIndicators.insights!.length} {contextIndicators.insights!.length === 1 ? t('common.insight') : t('common.insights')}
                  </Badge>
                )}
                {(contextIndicators.notes?.length ?? 0) > 0 && (
                  <Badge variant="secondary" className="h-7 gap-1.5 rounded-md px-2 font-normal">
                    <IconNote className="h-3 w-3" />
                    {contextIndicators.notes!.length} {contextIndicators.notes!.length === 1 ? t('common.note') : t('common.notes')}
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-shrink-0 items-center gap-1.5">
            <kbd className="hidden rounded-md border border-border/70 bg-muted/40 px-1.5 py-0.5 font-sans text-[10px] text-muted-foreground lg:inline-flex">
              {keyHint}
            </kbd>
            {onModelChange && (
              <ModelSelector
                currentModel={modelOverride}
                onModelChange={onModelChange}
                disabled={isStreaming}
              />
            )}
            <Button
              onClick={isStreaming ? onCancelStreaming : handleSend}
              disabled={isStreaming ? !onCancelStreaming : !input.trim()}
              size="icon"
              className="h-8.5 w-8.5 rounded-full shadow-none"
              aria-label={isStreaming ? t('chat.stopGenerating') : t('chat.pressToSend', { key: keyHint })}
              title={isStreaming ? t('chat.stopGenerating') : undefined}
            >
              {isStreaming ? (
                <IconSquare className="h-3.5 w-3.5 fill-current" />
              ) : (
                <IconSend className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Single chat message row. Memoized so historical messages don't re-render when
// unrelated state (e.g. the composer input) changes.
interface ChatMessageProps {
  message: SourceChatMessage
  notebookId?: string
  onReferenceClick: (type: string, id: string) => void
}

const ChatMessage = memo(function ChatMessage({
  message,
  notebookId,
  onReferenceClick
}: ChatMessageProps) {
  return (
    <div
      className={`flex gap-3 w-full min-w-0 ${message.type === 'human' ? 'justify-end' : 'justify-start'
        }`}
    >
      {message.type === 'ai' && (
        <div className="flex-shrink-0 mt-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-card">
            <Image src="/logo.svg" alt="NotebookE AI" width={20} height={20} className="dark:invert" />
          </div>
        </div>
      )}
      <div className={`flex min-w-0 max-w-[95%] flex-col gap-1.5 overflow-hidden ${message.type === 'human' ? 'max-w-[min(88%,58rem)] items-end' : 'items-start'}`}>
        <div
          className={`min-w-0 max-w-full overflow-hidden rounded-2xl px-4 py-3 ${message.type === 'human'
              ? 'rounded-tr-md border border-sky-100 bg-sky-50 text-slate-900 dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-50'
              : 'border border-border/50 bg-muted/40'
            }`}
        >
          {message.type === 'ai' ? (
            <AIMessageContent
              content={message.content}
              onReferenceClick={onReferenceClick}
            />
          ) : (
            <div className="whitespace-pre-wrap break-words text-[15px] font-normal leading-relaxed">
              {message.content}
            </div>
          )}
        </div>
        {message.type === 'ai' && (
          <div className="pl-1">
            <MessageActions
              content={message.content}
              notebookId={notebookId}
            />
          </div>
        )}
      </div>
      {message.type === 'human' && (
        <div className="flex-shrink-0 mt-1">
          <div className="h-7 w-7 rounded-full bg-muted border border-border/50 flex items-center justify-center">
            <IconUser className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>
      )}
    </div>
  )
})

// Helper component to render AI messages with clickable references
function AIMessageContent({
  content,
  onReferenceClick
}: {
  content: string
  onReferenceClick: (type: string, id: string) => void
}) {
  const { t } = useTranslation()
  // Convert references to compact markdown with numbered citations
  const markdownWithCompactRefs = convertReferencesToCompactMarkdown(content, t('common.references'))

  // Create custom link component for compact references
  const LinkComponent = createCompactReferenceLinkComponent(onReferenceClick)

  return (
    <MarkdownRenderer components={{
      a: LinkComponent
    }}>
      {markdownWithCompactRefs}
    </MarkdownRenderer>
  )
}

'use client'

import { memo, useCallback, useState, useRef, useEffect, useId } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { IconBulb, IconClock, IconFileText, IconLoader2, IconNote, IconRobot, IconSend, IconUser } from '@tabler/icons-react'
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <>
      <Card className="flex flex-col h-full flex-1 overflow-hidden border-border/60 bg-card/60 backdrop-blur-sm shadow-sm p-0 gap-0">
        <CardHeader className="px-4 py-2.5 flex-shrink-0 border-b border-border/40 !pb-2.5">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground">
              <span aria-hidden className="h-3.5 w-[3px] rounded-full bg-teal" />
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
                  <div className="h-16 w-16 mx-auto mb-6 bg-white dark:bg-black rounded-full border-2 border-border shadow-md flex items-center justify-center">
                    <Image src="/logo.png" alt="AI" width={44} height={44} className="dark:invert" />
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
                    <div className="h-8 w-8 rounded-full bg-white dark:bg-black border border-border shadow-sm flex items-center justify-center">
                      <Image src="/logo.png" alt="AI" width={22} height={22} className="dark:invert" />
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
  isStreaming,
  modelOverride,
  onModelChange,
  contextIndicators,
  notebookContextStats
}: ChatComposerProps) {
  const { t } = useTranslation()
  const chatInputId = useId()
  const [input, setInput] = useState('')

  const handleSend = () => {
    if (input.trim() && !isStreaming) {
      onSendMessage(input.trim(), modelOverride)
      setInput('')
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
    <div className="flex-shrink-0 p-4 space-y-3 border-t bg-card/60 backdrop-blur-sm">
      {/* Top row: Context & Model */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {notebookContextStats && (
            <ContextIndicator
              sourcesInsights={notebookContextStats.sourcesInsights}
              sourcesFull={notebookContextStats.sourcesFull}
              notesCount={notebookContextStats.notesCount}
              tokenCount={notebookContextStats.tokenCount}
              charCount={notebookContextStats.charCount}
              className="py-0 px-0 border-none bg-transparent"
            />
          )}
          {contextIndicators && !notebookContextStats && (
            <div className="flex flex-wrap gap-2 text-xs">
              {(contextIndicators.sources?.length ?? 0) > 0 && (
                <Badge variant="outline" className="gap-1">
                  <IconFileText className="h-3 w-3" />
                  {contextIndicators.sources!.length} {t('navigation.sources')}
                </Badge>
              )}
              {(contextIndicators.insights?.length ?? 0) > 0 && (
                <Badge variant="outline" className="gap-1">
                  <IconBulb className="h-3 w-3" />
                  {contextIndicators.insights!.length} {contextIndicators.insights!.length === 1 ? t('common.insight') : t('common.insights')}
                </Badge>
              )}
              {(contextIndicators.notes?.length ?? 0) > 0 && (
                <Badge variant="outline" className="gap-1">
                  <IconNote className="h-3 w-3" />
                  {contextIndicators.notes!.length} {contextIndicators.notes!.length === 1 ? t('common.note') : t('common.notes')}
                </Badge>
              )}
            </div>
          )}
        </div>

        {onModelChange && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-muted-foreground">{t('chat.model')}</span>
            <ModelSelector
              currentModel={modelOverride}
              onModelChange={onModelChange}
              disabled={isStreaming}
            />
          </div>
        )}
      </div>

      <div className="flex gap-2 items-end min-w-0 bg-muted/20 border border-border/50 rounded-xl focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all pr-2">
        <Textarea
          id={chatInputId}
          name="chat-message"
          autoComplete="off"
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={`${t('chat.sendPlaceholder')} (${t('chat.pressToSend', { key: keyHint })})`}
          disabled={isStreaming}
          className="flex-1 min-h-[50px] max-h-[250px] resize-none py-3 px-4 min-w-0 bg-transparent border-0 focus-visible:ring-0 shadow-none leading-relaxed"
          rows={1}
          style={{ height: '50px' }}
        />
        <div className="pb-2 flex-shrink-0">
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            size="icon"
            className="h-[36px] w-[36px] rounded-lg transition-all"
          >
            {isStreaming ? (
              <IconLoader2 className="h-4 w-4 animate-spin" />
            ) : (
              <IconSend className="h-4 w-4" />
            )}
          </Button>
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
          <div className="h-7 w-7 rounded-full bg-white dark:bg-black border border-border shadow-sm flex items-center justify-center">
            <Image src="/logo.png" alt="AI" width={20} height={20} className="dark:invert" />
          </div>
        </div>
      )}
      <div className={`flex flex-col gap-1.5 max-w-[95%] min-w-0 overflow-hidden ${message.type === 'human' ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-2.5 shadow-sm min-w-0 max-w-full overflow-hidden ${message.type === 'human'
              ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm'
              : 'bg-muted/40 border border-border/50 rounded-2xl rounded-tl-sm'
            }`}
        >
          {message.type === 'ai' ? (
            <AIMessageContent
              content={message.content}
              onReferenceClick={onReferenceClick}
            />
          ) : (
            <div className="text-[14px] leading-relaxed whitespace-pre-wrap break-words font-medium">
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

'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import { useState, useEffect } from 'react'
import { IconCheck, IconCopy } from '@tabler/icons-react'
import { useThemeStore } from '@/lib/stores/theme-store'
import { oneDark as darkTheme } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { oneLight as lightTheme } from 'react-syntax-highlighter/dist/esm/styles/prism'
import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/prism-light'
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash'
import c from 'react-syntax-highlighter/dist/esm/languages/prism/c'
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp'
import csharp from 'react-syntax-highlighter/dist/esm/languages/prism/csharp'
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css'
import diff from 'react-syntax-highlighter/dist/esm/languages/prism/diff'
import docker from 'react-syntax-highlighter/dist/esm/languages/prism/docker'
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go'
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java'
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript'
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json'
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx'
import kotlin from 'react-syntax-highlighter/dist/esm/languages/prism/kotlin'
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown'
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup'
import php from 'react-syntax-highlighter/dist/esm/languages/prism/php'
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python'
import r from 'react-syntax-highlighter/dist/esm/languages/prism/r'
import ruby from 'react-syntax-highlighter/dist/esm/languages/prism/ruby'
import rust from 'react-syntax-highlighter/dist/esm/languages/prism/rust'
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql'
import swift from 'react-syntax-highlighter/dist/esm/languages/prism/swift'
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx'
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript'
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml'

import type { ExtraProps } from 'react-markdown'
import type { ComponentProps, ElementType } from 'react'

const LANGUAGES = {
  bash, c, cpp, csharp, css, diff, docker, go, java, javascript, json, jsx,
  kotlin, markdown, markup, php, python, r, ruby, rust, sql, swift, tsx,
  typescript, yaml,
}
for (const [name, language] of Object.entries(LANGUAGES)) {
  SyntaxHighlighter.registerLanguage(name, language)
}

type Components = {
  [Key in Extract<ElementType, string>]?: ElementType<ComponentProps<Key> & ExtraProps>
}

const CodeBlock = ({ language, value, isDark }: { language: string, value: string, isDark: boolean }) => {
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    if (isCopied) {
      const timeout = setTimeout(() => setIsCopied(false), 2000)
      return () => clearTimeout(timeout)
    }
  }, [isCopied])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(value)
    setIsCopied(true)
  }

  return (
    <div className="relative group my-4 rounded-xl border border-border overflow-hidden bg-muted/20">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b border-border text-xs text-muted-foreground">
        <span className="font-mono lowercase">{language || 'text'}</span>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          {isCopied ? <IconCheck className="h-3.5 w-3.5" /> : <IconCopy className="h-3.5 w-3.5" />}
          <span>{isCopied ? 'Đã chép' : 'Sao chép'}</span>
        </button>
      </div>
      <div className="overflow-x-auto min-w-0">
        <SyntaxHighlighter
          language={language || 'text'}
          style={isDark ? darkTheme : lightTheme}
          PreTag="div"
          customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
          className="text-sm"
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}

export function MarkdownRenderer({
  children,
  components = {},
}: {
  children: React.ReactNode
  components?: Components
}) {
  const { getEffectiveTheme } = useThemeStore()
  const isDark = getEffectiveTheme() === 'dark'

  return (
    <div
      className={[
        // base prose
        'prose prose-neutral dark:prose-invert max-w-none break-words overflow-hidden',
        // headings
        'prose-headings:font-bold prose-headings:text-foreground',
        'prose-h1:text-[1.6rem] prose-h1:mt-8 prose-h1:mb-4 prose-h1:pb-2 prose-h1:border-b prose-h1:border-border',
        'prose-h2:text-[1.35rem] prose-h2:mt-7 prose-h2:mb-3',
        'prose-h3:text-[1.15rem] prose-h3:mt-5 prose-h3:mb-2',
        'prose-h4:text-base prose-h4:mt-4 prose-h4:mb-2',
        // paragraph
        'prose-p:text-[15px] prose-p:leading-[1.9] prose-p:mb-4 prose-p:text-foreground',
        // links
        'prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-a:font-medium prose-a:break-all',
        // inline text
        'prose-strong:font-bold prose-strong:text-foreground',
        'prose-em:italic prose-em:text-foreground/80',
        // lists
        'prose-ul:mb-4 prose-ul:pl-5 prose-ol:mb-4 prose-ol:pl-5',
        'prose-li:text-[15px] prose-li:leading-[1.8] prose-li:mb-1',
        // blockquote
        'prose-blockquote:border-l-4 prose-blockquote:border-primary/40 prose-blockquote:bg-muted/30',
        'prose-blockquote:rounded-r-xl prose-blockquote:pl-4 prose-blockquote:py-1 prose-blockquote:my-4',
        'prose-blockquote:text-muted-foreground prose-blockquote:italic prose-blockquote:not-italic',
        // hr
        'prose-hr:border-border prose-hr:my-8',
        // code
        'prose-code:before:content-none prose-code:after:content-none',
        'prose-pre:p-0 prose-pre:bg-transparent prose-pre:border-none',
        // images
        'prose-img:rounded-xl prose-img:border prose-img:border-border prose-img:shadow-sm',
        // Pass-through HTML inline styles (colors from DOCX extraction)
        '[&_span[style*="color"]]:text-inherit [&_font]:text-inherit',
      ].join(' ')}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={{
          p: ({ children }) => (
            <p className="mb-4 text-[15px] leading-[1.9] text-foreground">{children}</p>
          ),
          h1: ({ children }) => (
            <h1 className="text-[1.6rem] font-bold mt-8 mb-4 pb-2 border-b border-border text-foreground">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-[1.35rem] font-bold mt-7 mb-3 text-foreground">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[1.15rem] font-semibold mt-5 mb-2 text-foreground">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold mt-4 mb-2 text-foreground">{children}</h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-sm font-semibold mt-3 mb-2 text-foreground">{children}</h5>
          ),
          h6: ({ children }) => (
            <h6 className="text-sm font-semibold mt-3 mb-2 text-muted-foreground">{children}</h6>
          ),
          ul: ({ children }) => (
            <ul className="mb-4 list-disc pl-5 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-4 list-decimal pl-5 space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-[15px] leading-[1.8] mb-1">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/50 bg-muted/30 rounded-r-xl pl-4 pr-3 py-2 my-4 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-8 border-border" />,
          table: ({ children }) => (
            <div className="my-5 overflow-x-auto rounded-xl border border-border shadow-sm">
              <table className="min-w-full border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/60 border-b border-border">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-muted/30 transition-colors">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2.5 text-sm text-foreground">{children}</td>
          ),
          code: ({ children, className }) => {
            const match = /language-(\w+)/.exec(className || '')
            const isBlock = match || String(children).includes('\n')
            return isBlock ? (
              <CodeBlock 
                language={match ? match[1] : 'text'}
                value={String(children).replace(/\n$/, '')}
                isDark={isDark}
              />
            ) : (
              <code className="bg-muted text-primary rounded-md px-1.5 py-0.5 text-[13px] font-mono break-all">
                {children}
              </code>
            )
          },
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={alt || ''}
              className="max-w-full rounded-xl border border-border my-4 shadow-sm"
            />
          ),
          ...components,
        }}
      >
        {String(children)}
      </ReactMarkdown>
    </div>
  )
}

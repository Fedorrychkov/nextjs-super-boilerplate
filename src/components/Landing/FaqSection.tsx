'use client'

import { useState } from 'react'

import { useT } from '~/providers'
import { cn } from '~/utils/cn'

type FaqItem = {
  question: string
  answer: string
}

type Props = {
  items: FaqItem[]
}

const FaqRow = ({ question, answer }: FaqItem) => {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-border/60 last:border-0">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-4 py-5 text-left" aria-expanded={open}>
        <span className="font-medium text-foreground text-sm sm:text-base">{question}</span>
        <span className={cn('shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-45')} aria-hidden>
          +
        </span>
      </button>
      {open && <p className="pb-5 text-sm sm:text-base text-muted-foreground leading-relaxed">{answer}</p>}
    </div>
  )
}

export const FaqSection = ({ items }: Props) => {
  const t = useT()

  if (!items?.length) return null

  return (
    <section className="border-b border-border/40 py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">{t('nbs.faq.title')}</h2>
        </div>
        <div className="rounded-2xl border border-border bg-card px-6">
          {items.map((item) => (
            <FaqRow key={item.question} {...item} />
          ))}
        </div>
      </div>
    </section>
  )
}

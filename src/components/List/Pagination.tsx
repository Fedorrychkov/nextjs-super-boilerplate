'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Pagination as PaginationRoot, PaginationContent, PaginationEllipsis, PaginationItem } from '~/components/ui/pagination'

import { Button } from '../ui/button'

type Props = {
  currentPage: number
  pages: number
  onChange?: (page: number) => void
}

export const Pagination = ({ currentPage, pages: totalPages, onChange }: Props) => {
  const handleClick = (page: number) => {
    onChange?.(page)
  }

  const handlePrev = () => {
    if (currentPage > 1) {
      handleClick(currentPage - 1)
    }
  }

  const handleNext = () => {
    if (currentPage < totalPages) {
      handleClick(currentPage + 1)
    }
  }

  const pages = Array.from({ length: totalPages }).map((_, index) => index + 1)

  const firstThreePages = pages.slice(0, 3)
  const lastThreePages = pages.length > 3 ? pages.slice(-3).filter((page) => !firstThreePages.includes(page)) : []

  return (
    <PaginationRoot>
      <PaginationContent>
        <PaginationItem>
          <Button variant="ghost" onClick={handlePrev} disabled={currentPage === 1}>
            <ChevronLeft className="rtl:rotate-180" /> Prev
          </Button>
        </PaginationItem>
        {firstThreePages.map((page) => (
          <PaginationItem key={page}>
            <Button onClick={() => handleClick(page)} disabled={currentPage === page} variant={currentPage === page ? 'outline' : 'ghost'}>
              {page}
            </Button>
          </PaginationItem>
        ))}
        {totalPages > 3 && (
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        )}
        {lastThreePages.map((page) => (
          <PaginationItem key={page}>
            <Button onClick={() => handleClick(page)} disabled={currentPage === page} variant={currentPage === page ? 'outline' : 'ghost'}>
              {page}
            </Button>
          </PaginationItem>
        ))}
        <PaginationItem>
          <Button variant="ghost" onClick={handleNext} disabled={currentPage === totalPages}>
            Next <ChevronRight className="rtl:rotate-180" />
          </Button>
        </PaginationItem>
      </PaginationContent>
    </PaginationRoot>
  )
}

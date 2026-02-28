import { useState } from 'react'

type Props = {
  limit: number
}

export const usePagination = ({ limit }: Props) => {
  const [page, setPage] = useState(1)

  const handleSetPage = (page: number) => {
    setPage(page)
  }

  return {
    page,
    setPage: handleSetPage,
    offset: (page - 1) * limit,
  }
}

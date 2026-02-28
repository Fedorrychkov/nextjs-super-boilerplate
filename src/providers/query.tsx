'use client'

import { ReactNode, useState } from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'

export const QueryProvider = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(() => new QueryClient())

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

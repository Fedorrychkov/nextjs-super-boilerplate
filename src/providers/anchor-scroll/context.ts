import { createContext } from 'react'

type AnchorScrollContextValue = {
  scrollToAnchor: (hashOrId: string) => void
}

export const AnchorScrollContext = createContext<AnchorScrollContextValue | null>(null)

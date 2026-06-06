import { forwardRef } from 'react'

import { FilterContainer, type FilterContainerProps } from '~/components/Filters/FilterContainer'
import type { FilterOption } from '~/types'

export const NotificationsFilter = forwardRef<HTMLDivElement, FilterContainerProps<Record<string, FilterOption>>>(FilterContainer)

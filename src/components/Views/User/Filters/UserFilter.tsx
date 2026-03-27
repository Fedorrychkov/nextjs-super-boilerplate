import { forwardRef } from 'react'

import { FilterContainer, type FilterContainerProps } from '~/components/Filters/FilterContainer'
import type { FilterOption } from '~/types'

export const UsersFilter = forwardRef<HTMLDivElement, FilterContainerProps<Record<string, FilterOption>>>(FilterContainer)

import { useEffect, useMemo, useState } from 'react'

import { usePeriodState } from '~/components/Filters'
import { useSwitch } from '~/hooks/useSwitch'
import { FilterOption } from '~/types'

type Props<T> = {
  ref?: React.RefObject<HTMLDivElement | null>
  defaultFilterValues: T
  filterValues: Record<keyof T, FilterOption>
}

export const useDefaultFilters = <T extends Record<string, any>>(props: Props<T>) => {
  const { ref, defaultFilterValues, filterValues } = props

  const { handleChangePeriod, period, isEnabled: isPeriodEnabled } = usePeriodState(false)
  const [isFilterOpen, { toggle: toggleFilter }] = useSwitch(false)
  const [filters, setFilters] = useState<Record<keyof T, unknown>>(defaultFilterValues)
  const [debouncedFilters, setDebouncedFilters] = useState<Record<keyof T, unknown>>(defaultFilterValues)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters)
    }, 1000)

    return () => {
      clearTimeout(timer)
    }
  }, [filters])

  const handleClearFilters = () => {
    setFilters(defaultFilterValues)
  }

  const handleToggleFilter = () => {
    if (!isFilterOpen && ref?.current) {
      window.scrollTo({ top: ref.current?.offsetTop ?? 0, behavior: 'smooth' })
    }

    toggleFilter()
  }

  const settledFiltersCount = useMemo(() => {
    let count = 0

    if (period?.fromDate && period?.toDate) {
      count++
    }

    Object.keys(filters).forEach((key) => {
      if (filters?.[key as keyof T] !== filterValues[key as keyof T]?.value) {
        count++
      }
    })

    return count
  }, [period, filters, filterValues])

  return {
    isFilterOpen,
    toggleFilter: handleToggleFilter,
    filters,
    debouncedFilters,
    setFilters,
    handleChangePeriod,
    handleClearFilters,
    period,
    isPeriodEnabled,
    settledFiltersCount,
  }
}

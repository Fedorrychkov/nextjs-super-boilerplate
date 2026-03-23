import { useCallback, useEffect, useState } from 'react'

import { time } from '~/utils/time'

const toDate = time().endOf('day')
const fromDate = toDate.startOf('day')

/**
 * @param {string} isDefined parameter that disables default values in the period, requires an explicit boolean parameter
 * @return {Object}
 */
export const usePeriodState = (isDefined = true) => {
  const [isEnabled, setEnabled] = useState(!!isDefined)
  const [period, setPeriod] = useState<{ fromDate?: string; toDate?: string }>(
    isDefined
      ? {
          fromDate: fromDate.toString(),
          toDate: toDate.toString(),
        }
      : { fromDate: undefined, toDate: undefined },
  )

  /**
   * If for some reason the period is not set automatically, we toggle enabled to true
   */
  useEffect(() => {
    setTimeout(() => setEnabled(true), 5000)
  }, [])

  const handleChangePeriod = useCallback((fromDate?: string, toDate?: string) => {
    setEnabled(true)
    setPeriod({ fromDate, toDate })
  }, [])

  return {
    handleChangePeriod,
    period,
    isEnabled,
  }
}

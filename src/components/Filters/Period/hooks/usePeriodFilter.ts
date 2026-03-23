import dayjs from 'dayjs'
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react'

import { time } from '~/utils/time'

import { Period } from './period.types'
import { getDatetime } from './utils'

type Props = {
  onChangePeriod?: (from?: string, to?: string) => void
  defaultPeriod?: Period
  defaultFromDate?: dayjs.Dayjs
  defaultToDate?: dayjs.Dayjs
}

export const usePeriodFilter = (props: Props) => {
  const { onChangePeriod, defaultPeriod = Period.perDay, defaultFromDate: definedFromDate, defaultToDate: definedToDate } = props
  const [period, setPeriod] = useState(defaultPeriod || Period.perDay)
  const [fromDate, setFromDate] = useState<number | undefined>()
  const [toDate, setToDate] = useState<number | undefined>()
  const [customFromDate, setCustomFromDate] = useState<dayjs.Dayjs | null>(null)
  const [customToDate, setCustomToDate] = useState<dayjs.Dayjs | null>(null)
  const isCustom = period === Period.custom

  const { fromDate: defaultFromDate, toDate: defaultToDate } = useMemo(() => {
    const toDate = definedToDate ? definedToDate : time().endOf('day')
    const fromDate = definedFromDate ? definedFromDate : toDate.startOf('day')

    return { fromDate, toDate }
  }, [definedFromDate, definedToDate])

  const handleChangePeriod = useCallback(
    (selectedPeriod: Period) => {
      setPeriod(selectedPeriod)

      let { fromDate, toDate } = getDatetime(selectedPeriod, defaultFromDate, defaultToDate)

      if (selectedPeriod === Period.custom) {
        const { fromDate: computedFromDate, toDate: computedToDate } = getDatetime(period || defaultPeriod || Period.perDay)
        fromDate = computedFromDate
        toDate = computedToDate
      }

      setFromDate(fromDate?.unix())
      setToDate(toDate?.unix())

      onChangePeriod?.(fromDate?.toString(), toDate?.toString())
      setCustomFromDate?.(fromDate || defaultFromDate)
      setCustomToDate?.(toDate || defaultToDate)
    },
    [onChangePeriod, defaultFromDate, defaultToDate, defaultPeriod, period],
  )

  useEffect(() => {
    handleChangePeriod(defaultPeriod)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSaveCustomPeriod = () => {
    onChangePeriod?.(customFromDate?.toString(), customToDate?.toString())
  }

  const handleChangeCustomDate =
    (direction: 'from' | 'to' = 'from', type: 'date' | 'datetime' = 'datetime') =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      let date = time(e.target.value)

      if (type === 'date' && direction === 'from') {
        date = date.startOf('day')
      }

      if (type === 'date' && direction === 'to') {
        date = date.endOf('day')
      }

      if (direction === 'from') {
        setCustomFromDate(date)
      }

      if (direction === 'to') {
        setCustomToDate(date)
      }
    }

  const isCustomDatesError = (customFromDate?.unix() || 0) > (customToDate?.unix() || 0)

  return {
    period,
    isCustom,
    fromDate,
    toDate,
    customFromDate,
    defaultFromDate,
    defaultToDate,
    customToDate,
    isCustomDatesError,
    handleSaveCustomPeriod,
    handleChangePeriod,
    handleChangeCustomDate,
  }
}

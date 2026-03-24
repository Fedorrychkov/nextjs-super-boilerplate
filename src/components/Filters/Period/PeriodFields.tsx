import dayjs from 'dayjs'
import { useMemo } from 'react'

import { Button, Typography } from '~/components/ui'
import { Input } from '~/components/ui/input'
import { Select } from '~/components/ui/select-1'
import { cn } from '~/utils/cn'

import { Period, periodFilterOptions, usePeriodFilter } from './hooks'

type Props = {
  className?: string
  onChangePeriod?: (from?: string, to?: string) => void
  isLoading?: boolean
  defaultPeriod?: Period
  type?: 'datetime' | 'date'
  availablePeriods?: Period[]
  defaultFromDate?: dayjs.Dayjs
  defaultToDate?: dayjs.Dayjs
  maxToDate?: dayjs.Dayjs
  minToDate?: dayjs.Dayjs
  minFromDate?: dayjs.Dayjs
  maxFromDate?: dayjs.Dayjs
  isAllEnabled?: boolean
  isEnabledDefaultMaxDate?: boolean
  isHideUnderText?: boolean
  /**
   * Day range
   */
  range?: number
}

export const PeriodFields = (props: Props) => {
  const {
    isLoading,
    onChangePeriod,
    availablePeriods,
    defaultPeriod = Period.perDay,
    type = 'datetime',
    defaultFromDate: definedFromDate,
    defaultToDate: definedToDate,
    minToDate,
    maxToDate,
    minFromDate,
    maxFromDate,
    className,
    isEnabledDefaultMaxDate = false,
    isHideUnderText = false,
    range,
  } = props
  const {
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
  } = usePeriodFilter({ onChangePeriod, defaultPeriod, defaultFromDate: definedFromDate, defaultToDate: definedToDate })

  const { finalMaxToDate: prefinalMaxToDate, finalMaxFromDate } = useMemo(() => {
    const finalMaxToDate = isEnabledDefaultMaxDate ? dayjs().endOf('day') : maxToDate
    let finalMaxFromDate = isEnabledDefaultMaxDate ? dayjs().endOf('day') : maxFromDate

    if (customToDate || customFromDate) {
      finalMaxFromDate = customToDate?.isValid() ? customToDate : finalMaxFromDate
    }

    return {
      finalMaxToDate,
      finalMaxFromDate,
    }
  }, [isEnabledDefaultMaxDate, maxToDate, maxFromDate, customFromDate, customToDate])

  const { finalMinFromDate, finalMaxToDate } = useMemo(() => {
    if (!range) {
      return {
        finalMinFromDate: minFromDate,
        finalMaxToDate: prefinalMaxToDate,
      }
    }

    let finalMinFromDate = minFromDate
    let finalMaxToDate = prefinalMaxToDate

    if (customToDate || customFromDate) {
      finalMinFromDate = customToDate?.isValid() ? customToDate.subtract(range, 'day') : minFromDate
      finalMaxToDate = customFromDate?.isValid() ? customFromDate.add(range, 'day') : prefinalMaxToDate
    }

    if (minFromDate) {
      finalMinFromDate = finalMinFromDate?.isBefore(minFromDate) ? minFromDate : finalMinFromDate
    }

    if (prefinalMaxToDate) {
      finalMaxToDate = prefinalMaxToDate?.isBefore(finalMaxToDate) ? prefinalMaxToDate : finalMaxToDate
    }

    return {
      finalMinFromDate,
      finalMaxToDate,
    }
  }, [range, minFromDate, customFromDate, customToDate, prefinalMaxToDate])

  const fieldType = useMemo(() => {
    if (type === 'datetime') {
      return 'datetime-local'
    }

    return 'date'
  }, [type])

  const dateFormat = useMemo(() => {
    if (fieldType === 'datetime-local') {
      return 'YYYY-MM-DDTHH:mm'
    }

    return 'YYYY-MM-DD'
  }, [fieldType])

  const periods = useMemo(() => {
    const periods = periodFilterOptions.map((period) => ({ text: period.label, value: period.type }))

    if (!availablePeriods?.length) return periods

    return periods.filter((period) => {
      const has = !!availablePeriods?.find((item) => item === period.value)

      return has
    })
  }, [availablePeriods])

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Select
        size="medium"
        variant="default"
        options={periods.map((period) => ({ value: period.value, label: period.text }))}
        value={period}
        onChange={(event) => handleChangePeriod(event.target.value as Period)}
      />

      {!isCustom && fromDate && toDate && !isHideUnderText && (
        <div className="flex flex-row gap-2 flex-wrap">
          <Typography variant="Body/XS/Regular">selected period from {dayjs.unix(fromDate).format(dateFormat)}</Typography>
          <Typography variant="Body/XS/Regular">to {dayjs.unix(toDate).format(dateFormat)}</Typography>
        </div>
      )}

      {isCustom && (
        <div className="w-full">
          <div className="flex flex-col sm:flex-row items-end gap-3 mt-3">
            <div className="flex flex-row flex-wrap gap-2">
              <Input
                id="datetime-from"
                label="From"
                type={fieldType}
                defaultValue={customFromDate ? undefined : defaultFromDate.format(dateFormat) || undefined}
                value={customFromDate?.format(dateFormat) || ''}
                onChangeEvent={handleChangeCustomDate('from', type)}
                disabled={isLoading}
                error={isCustomDatesError}
                size="small"
                {...(finalMinFromDate ? { min: finalMinFromDate.format(dateFormat) } : {})}
                {...(finalMaxFromDate ? { max: finalMaxFromDate.format(dateFormat) } : {})}
              />
              <Input
                id="datetime-to"
                label="To"
                type={fieldType}
                defaultValue={customToDate ? undefined : defaultToDate.format(dateFormat) || undefined}
                value={customToDate?.format(dateFormat) || ''}
                onChangeEvent={handleChangeCustomDate('to', type)}
                error={isCustomDatesError}
                disabled={isLoading}
                size="small"
                {...(minToDate ? { min: minToDate.format(dateFormat) } : {})}
                {...(finalMaxToDate ? { max: finalMaxToDate.format(dateFormat) } : {})}
              />
            </div>
            <Button type="button" onClick={handleSaveCustomPeriod} className="sm:w-auto w-full" variant="default" disabled={isLoading || isCustomDatesError}>
              Apply dates
            </Button>
          </div>
          {isCustomDatesError && (
            <p className="mt-2 text-errorDefault font-golos">
              Date {'"'}from{'"'} cannot be greater than date {'"'}to{'"'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

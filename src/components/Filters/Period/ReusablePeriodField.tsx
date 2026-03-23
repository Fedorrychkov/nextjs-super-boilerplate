import dayjs from 'dayjs'

import { Period } from './hooks'
import { PeriodFields } from './PeriodFields'

type Props = {
  onChangePeriod?: (from?: string, to?: string) => void
  isLoading?: boolean
  defaultPeriod?: Period
  minFromDate?: dayjs.Dayjs
  availablePeriods?: Period[]
  range?: number
  isHideUnderText?: boolean
}

export const ReusablePeriodField = (props: Props) => {
  const { isLoading, onChangePeriod, defaultPeriod = Period.perDay, minFromDate, range, availablePeriods, isHideUnderText } = props

  return (
    <PeriodFields
      isAllEnabled={false}
      isLoading={isLoading}
      onChangePeriod={onChangePeriod}
      isEnabledDefaultMaxDate
      minFromDate={minFromDate}
      range={range}
      isHideUnderText={isHideUnderText}
      availablePeriods={availablePeriods ? availablePeriods : [...Object.values(Period).filter((period) => period !== Period.custom), Period.custom]}
      defaultPeriod={defaultPeriod}
    />
  )
}

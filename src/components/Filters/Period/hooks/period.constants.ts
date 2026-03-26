import { AppMessageKey } from '~/lib/i18n'

import { Period } from './period.types'

export const periodFilterOptions: { type: Period; label: string; labelLocalizationKey: AppMessageKey }[] = [
  {
    type: Period.perMinute,
    label: 'Last minute',
    labelLocalizationKey: 'common.sortDates.lastMinute',
  },
  {
    type: Period.per30Minute,
    label: 'Last 30 minutes',
    labelLocalizationKey: 'common.sortDates.last30Minutes',
  },
  {
    type: Period.perHour,
    label: 'Last hour',
    labelLocalizationKey: 'common.sortDates.lastHour',
  },
  {
    type: Period.per4Hour,
    label: 'Last 4 hours',
    labelLocalizationKey: 'common.sortDates.last4Hours',
  },
  {
    type: Period.per8Hour,
    label: 'Last 8 hours',
    labelLocalizationKey: 'common.sortDates.last8Hours',
  },
  {
    type: Period.per12Hour,
    label: 'Last 12 hours',
    labelLocalizationKey: 'common.sortDates.last12Hours',
  },
  {
    type: Period.last24hour,
    label: 'Last 24 hours',
    labelLocalizationKey: 'common.sortDates.last24Hours',
  },
  {
    type: Period.perDay,
    label: 'Current day',
    labelLocalizationKey: 'common.sortDates.currentDay',
  },
  {
    type: Period.perYesterday,
    label: 'Yesterday',
    labelLocalizationKey: 'common.sortDates.yesterday',
  },
  {
    type: Period.perWeek,
    label: 'Current week',
    labelLocalizationKey: 'common.sortDates.currentWeek',
  },
  {
    type: Period.last7days,
    label: 'Last 7 days',
    labelLocalizationKey: 'common.sortDates.last7Days',
  },
  {
    type: Period.perMonth,
    label: 'Current month',
    labelLocalizationKey: 'common.sortDates.currentMonth',
  },
  {
    type: Period.last30days,
    label: 'Last 30 days',
    labelLocalizationKey: 'common.sortDates.last30Days',
  },
  {
    type: Period.last3month,
    label: 'Last 3 months',
    labelLocalizationKey: 'common.sortDates.last3Months',
  },
  {
    type: Period.last6month,
    label: 'Last 6 months',
    labelLocalizationKey: 'common.sortDates.last6Months',
  },
  {
    type: Period.perAllTime,
    label: 'All time',
    labelLocalizationKey: 'common.sortDates.allTime',
  },
  {
    type: Period.custom,
    label: 'Specify your period',
    labelLocalizationKey: 'common.sortDates.specifyYourPeriod',
  },
]

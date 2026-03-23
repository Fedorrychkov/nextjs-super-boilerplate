import { Period } from './period.types'

export const periodFilterOptions = [
  {
    type: Period.perMinute,
    label: 'Last minute',
  },
  {
    type: Period.per30Minute,
    label: 'Last 30 minutes',
  },
  {
    type: Period.perHour,
    label: 'Last hour',
  },
  {
    type: Period.per4Hour,
    label: 'Last 4 hours',
  },
  {
    type: Period.per8Hour,
    label: 'Last 8 hours',
  },
  {
    type: Period.per12Hour,
    label: 'Last 12 hours',
  },
  {
    type: Period.last24hour,
    label: 'Last 24 hours',
  },
  {
    type: Period.perDay,
    label: 'Current day',
  },
  {
    type: Period.perYesterday,
    label: 'Yesterday',
  },
  {
    type: Period.perWeek,
    label: 'Current week',
  },
  {
    type: Period.last7days,
    label: 'Last 7 days',
  },
  {
    type: Period.perMonth,
    label: 'Current month',
  },
  {
    type: Period.last30days,
    label: 'Last 30 days',
  },
  {
    type: Period.last3month,
    label: 'Last 3 months',
  },
  {
    type: Period.last6month,
    label: 'Last 6 months',
  },
  {
    type: Period.perAllTime,
    label: 'All time',
  },
  {
    type: Period.custom,
    label: 'Specify your period',
  },
]

import dayjs from 'dayjs'

import { Period } from './period.types'

export const getDatetime = (period: Period, defaultFromDate?: dayjs.Dayjs, defaultToDate?: dayjs.Dayjs) => {
  let fromDate: dayjs.Dayjs | undefined
  let toDate: dayjs.Dayjs | undefined

  if (period === Period.custom) {
    fromDate = defaultFromDate
    toDate = defaultToDate
  }

  if (period === Period.perMinute) {
    toDate = dayjs()
    fromDate = toDate.subtract(1, 'minute')
  }

  if (period === Period.perHour) {
    toDate = dayjs()
    fromDate = toDate.subtract(1, 'hour')
  }

  if (period === Period.perDay) {
    toDate = dayjs().endOf('day')
    fromDate = toDate.startOf('day')
  }

  if (period === Period.perYesterday) {
    toDate = dayjs().subtract(1, 'day').endOf('day')
    fromDate = toDate.startOf('day')
  }

  if (period === Period.per30Minute) {
    toDate = dayjs()
    fromDate = toDate.subtract(30, 'minute')
  }

  if (period === Period.per4Hour) {
    toDate = dayjs()
    fromDate = toDate.subtract(4, 'hour')
  }

  if (period === Period.per8Hour) {
    toDate = dayjs()
    fromDate = toDate.subtract(8, 'hour')
  }

  if (period === Period.per12Hour) {
    toDate = dayjs()
    fromDate = toDate.subtract(12, 'hour')
  }

  if (period === Period.last24hour) {
    toDate = dayjs()
    fromDate = toDate.subtract(24, 'hour')
  }

  if (period === Period.perWeek) {
    toDate = dayjs().locale('ru', { weekStart: 1 }).endOf('week')
    fromDate = toDate.startOf('week')
  }

  if (period === Period.last7days) {
    toDate = dayjs().endOf('day')
    fromDate = toDate.startOf('day').subtract(7, 'day')
  }

  if (period === Period.perMonth) {
    toDate = dayjs().endOf('month')
    fromDate = toDate.startOf('month')
  }

  if (period === Period.last30days) {
    toDate = dayjs().endOf('day')
    fromDate = toDate.subtract(30, 'day').startOf('day')
  }

  if (period === Period.last3month) {
    toDate = dayjs().endOf('day')
    fromDate = toDate.subtract(3, 'month').startOf('day')
  }

  if (period === Period.last6month) {
    toDate = dayjs().endOf('day')
    fromDate = toDate.subtract(6, 'month').startOf('day')
  }

  if (period === Period.perAllTime) {
    fromDate = undefined
    toDate = undefined
  }

  return {
    fromDate,
    toDate,
  }
}

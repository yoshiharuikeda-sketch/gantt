import {
  format,
  differenceInDays,
  addDays,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  isToday,
  isBefore,
  isAfter,
} from 'date-fns'
import { ja } from 'date-fns/locale'

export {
  format,
  differenceInDays,
  addDays,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  isToday,
  isBefore,
  isAfter,
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-'
  return format(new Date(date), 'yyyy/MM/dd', { locale: ja })
}

export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return '-'
  return format(new Date(date), 'M/d', { locale: ja })
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-'
  return format(new Date(date), 'yyyy/MM/dd HH:mm', { locale: ja })
}

export function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

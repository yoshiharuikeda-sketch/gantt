export const DAY_WIDTH_MAP: Record<string, number> = {
  day: 40,
  week: 14,
  month: 5,
}

export function getBarX(
  date: Date | string,
  timelineStart: Date,
  dayWidth: number
): number {
  const d = typeof date === 'string' ? new Date(date) : date
  const diff = Math.floor(
    (d.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)
  )
  return diff * dayWidth
}

export function getBarWidth(
  startDate: Date | string,
  endDate: Date | string,
  dayWidth: number
): number {
  const s = typeof startDate === 'string' ? new Date(startDate) : startDate
  const e = typeof endDate === 'string' ? new Date(endDate) : endDate
  const diff = Math.max(
    1,
    Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
  )
  return diff * dayWidth
}

export function getDateFromX(
  x: number,
  timelineStart: Date,
  dayWidth: number
): Date {
  const days = Math.round(x / dayWidth)
  const result = new Date(timelineStart)
  result.setDate(result.getDate() + days)
  return result
}

export function getTimelineRange(tasks: { start_date: string | null; end_date: string | null }[]): {
  start: Date
  end: Date
} {
  const today = new Date()
  const dates = tasks
    .flatMap((t) => [t.start_date, t.end_date])
    .filter(Boolean)
    .map((d) => new Date(d!))

  if (dates.length === 0) {
    const start = new Date(today)
    start.setDate(1)
    const end = new Date(start)
    end.setMonth(end.getMonth() + 3)
    return { start, end }
  }

  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())))
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))

  // Add padding
  minDate.setDate(minDate.getDate() - 7)
  maxDate.setDate(maxDate.getDate() + 14)

  return { start: minDate, end: maxDate }
}

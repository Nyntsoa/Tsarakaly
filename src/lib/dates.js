/** Returns the current calendar date in the restaurant's time zone (YYYY-MM-DD). */
export function getTodayInTimezone(timezone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  )
  return `${values.year}-${values.month}-${values.day}`
}
/** Returns the weekday for an ISO calendar date (0 Sunday through 6 Saturday). */
export function getWeekday(dateValue) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return null
  const date = new Date(`${dateValue}T00:00:00.000Z`)
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== dateValue
  )
    return null
  return date.getUTCDay()
}

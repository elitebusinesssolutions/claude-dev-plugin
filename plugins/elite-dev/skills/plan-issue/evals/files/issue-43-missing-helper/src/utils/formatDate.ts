/**
 * Formats a date as an absolute, locale-aware date string.
 *
 * @param value - An ISO 8601 timestamp.
 */
export function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

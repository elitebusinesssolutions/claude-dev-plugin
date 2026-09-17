/**
 * Formats a numeric amount as currency for the active locale.
 *
 * @param amount - The amount in major units (dollars, not cents).
 * @param currency - An ISO 4217 code, for example "USD" or "EUR".
 */
export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(amount);
}

export function parseIsoDate(value: string): Date {
  return new Date(value);
}

export function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString();
}

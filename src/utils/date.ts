export function parseDate(dateValue: string | number | Date | null | undefined): Date | null {
  if (!dateValue) return null;
  if (typeof dateValue === 'string') {
    return new Date(dateValue.replace(' ', 'T'));
  }
  return new Date(dateValue);
}

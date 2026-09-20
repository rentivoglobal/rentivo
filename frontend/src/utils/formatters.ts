/**
 * Formatting Utilities for Rentivo
 */

export function formatNaira(amount: number | string): string {
  const num = typeof amount === 'number' ? amount : Number(amount) || 0;
  return '₦' + num.toLocaleString('en-NG');
}

export function formatPeriod(period: 'per_year' | 'per_month' | 'per_sale' | string): string {
  switch (period) {
    case 'per_year':
      return '/year';
    case 'per_month':
      return '/month';
    case 'per_sale':
      return ' total';
    default:
      return '/year';
  }
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Formatting Utilities for Rentivo
 */

export function formatNaira(amount: number | string): string {
  if (typeof amount === 'string') {
    // Strip any lingering ASCII 'N' or whitespace if present
    const cleaned = amount.replace(/^[N₦]\s?/, '').replace(/,/g, '').trim();
    const parsed = Number(cleaned);
    if (!isNaN(parsed)) {
      return '₦' + parsed.toLocaleString('en-NG');
    }
  }
  const num = typeof amount === 'number' ? amount : Number(amount) || 0;
  return '₦' + num.toLocaleString('en-NG');
}

export function formatPeriod(period?: 'per_year' | 'per_month' | 'per_sale' | 'outright' | string, propertyType?: string): string {
  if (propertyType?.toLowerCase() === 'land') {
    return ' total';
  }
  switch (period?.toLowerCase()) {
    case 'per_year':
    case '/year':
    case 'yearly':
      return '/year';
    case 'per_month':
    case '/month':
    case 'monthly':
      return '/month';
    case 'per_sale':
    case 'sale':
    case '/sale':
    case 'outright':
      return ' total';
    default:
      return '/year';
  }
}

export function formatPriceWithPeriod(
  price: number | string, 
  period?: 'per_year' | 'per_month' | 'per_sale' | 'outright' | string, 
  propertyType?: string
): string {
  return `${formatNaira(price)} ${formatPeriod(period, propertyType)}`;
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


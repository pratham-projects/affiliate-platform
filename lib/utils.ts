import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number with comma separators (e.g., 1,234,567)
 */
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '0'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '0'
  return num.toLocaleString('en-US')
}

/**
 * Format a currency amount coming from cents (API) to dollars for display
 * @param value - The numeric value in cents
 * @param currency - Currency symbol (default: '$')
 * @param showCurrency - Whether to show the currency symbol (default: true)
 */
export function formatCurrency(
  value: number | string | null | undefined,
  currency: string = '$',
  showCurrency: boolean = true
): string {
  const symbol = getCurrencySymbol(currency)
  if (value === null || value === undefined || value === '') return showCurrency ? `${symbol}0.00` : '0.00'
  let num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return showCurrency ? `${symbol}0.00` : '0.00'

  // Convert cents -> dollars
  num = num / 100

  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return showCurrency ? `${symbol}${formatted}` : formatted
}

/**
 * Format a percentage coming from basis points (API) for display
 * @param value - The numeric value in basis points (1000 = 10%)
 * @param decimals - Number of decimal places (default: 1)
 */
export function formatPercent(
  value: number | string | null | undefined,
  decimals: number = 1
): string {
  if (value === null || value === undefined || value === '') return '0%'
  let num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '0%'

  // Convert basis points -> percentage
  num = num / 100

  return `${num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`
}

/**
 * Get currency symbol from currency code
 */
export function getCurrencySymbol(currency: string | null | undefined): string {
  if (!currency) return '$'
  const c = currency.toUpperCase()
  if (c === 'USD') return '$'
  return c
}

/**
 * Format a date object or string into a DD/MM/YYYY format.
 * @param date - The date to format.
 * @returns The formatted date string.
 */
export function formatDate(date: string | number | Date | null | undefined): string {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('en-GB')
}

/**
 * Format a date object or string into a DD/MM/YYYY, HH:MM format.
 * @param date - The date to format.
 * @returns The formatted date and time string.
 */
export function formatDateTime(date: string | number | Date | null | undefined): string {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

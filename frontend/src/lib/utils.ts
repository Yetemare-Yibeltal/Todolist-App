import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, formatDistanceToNowStrict, formatRelative, isToday, isYesterday, isThisWeek, isThisMonth, isThisYear, differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds, parseISO, isValid, addDays, subDays, addHours, subHours, addMinutes, subMinutes, addSeconds, subSeconds, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isAfter, isBefore, isEqual, isWithinInterval, areIntervalsOverlapping } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined, formatStr: string = 'MMM d, yyyy'): string {
  if (!date) return '';
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) return '';
  return format(parsedDate, formatStr);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '';
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) return '';
  return format(parsedDate, 'MMM d, yyyy HH:mm');
}

export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return '';
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) return '';
  
  const now = new Date();
  const diffInSeconds = differenceInSeconds(now, parsedDate);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  }
  
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  }
  
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  }
  
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  }
  
  return formatDistanceToNow(parsedDate, { addSuffix: true });
}

export function formatDistanceToNowDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) return '';
  return formatDistanceToNow(parsedDate, { addSuffix: true });
}

export function formatDistanceToNowStrictDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) return '';
  return formatDistanceToNowStrict(parsedDate, { addSuffix: true });
}

export function formatRelativeDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) return '';
  return formatRelative(parsedDate, new Date());
}

export function isTodayDate(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) return false;
  return isToday(parsedDate);
}

export function isYesterdayDate(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) return false;
  return isYesterday(parsedDate);
}

export function isThisWeekDate(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) return false;
  return isThisWeek(parsedDate);
}

export function isThisMonthDate(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) return false;
  return isThisMonth(parsedDate);
}

export function isThisYearDate(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) return false;
  return isThisYear(parsedDate);
}

export function getTimeAgo(date: Date | string | null | undefined): string {
  return formatRelativeTime(date);
}

export function getHumanReadableDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) return '';
  
  if (isToday(parsedDate)) {
    return `Today at ${format(parsedDate, 'h:mm a')}`;
  }
  
  if (isYesterday(parsedDate)) {
    return `Yesterday at ${format(parsedDate, 'h:mm a')}`;
  }
  
  if (isThisWeek(parsedDate)) {
    return format(parsedDate, 'EEEE');
  }
  
  return formatDate(parsedDate);
}

export function getFullHumanReadableDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) return '';
  return format(parsedDate, 'EEEE, MMMM d, yyyy');
}

export function getDateRangeLabel(start: Date | string, end: Date | string): string {
  const startDate = typeof start === 'string' ? parseISO(start) : start;
  const endDate = typeof end === 'string' ? parseISO(end) : end;
  
  if (!isValid(startDate) || !isValid(endDate)) return '';
  
  if (isToday(startDate) && isToday(endDate)) {
    return `Today (${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')})`;
  }
  
  if (isYesterday(startDate) && isYesterday(endDate)) {
    return `Yesterday (${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')})`;
  }
  
  if (isThisWeek(startDate) && isThisWeek(endDate)) {
    return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
  }
  
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

export function isOverdue(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) return false;
  return isBefore(parsedDate, new Date());
}

export function isUpcoming(date: Date | string | null | undefined, days: number = 7): boolean {
  if (!date) return false;
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) return false;
  const future = addDays(new Date(), days);
  return isAfter(parsedDate, new Date()) && isBefore(parsedDate, future);
}

export function getDaysUntil(date: Date | string | null | undefined): number {
  if (!date) return 0;
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) return 0;
  return differenceInDays(parsedDate, new Date());
}

export function getHoursUntil(date: Date | string | null | undefined): number {
  if (!date) return 0;
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) return 0;
  return differenceInHours(parsedDate, new Date());
}

export function getMinutesUntil(date: Date | string | null | undefined): number {
  if (!date) return 0;
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) return 0;
  return differenceInMinutes(parsedDate, new Date());
}

export function getDaysOverdue(date: Date | string | null | undefined): number {
  if (!date) return 0;
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsedDate)) return 0;
  return differenceInDays(new Date(), parsedDate);
}

export function getDateRange(period: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear'): { start: Date; end: Date } {
  const now = new Date();
  let start = now;
  let end = now;

  switch (period) {
    case 'today':
      start = startOfDay(now);
      end = endOfDay(now);
      break;
    case 'yesterday':
      start = startOfDay(subDays(now, 1));
      end = endOfDay(subDays(now, 1));
      break;
    case 'thisWeek':
      start = startOfWeek(now);
      end = endOfWeek(now);
      break;
    case 'lastWeek':
      start = startOfWeek(subDays(now, 7));
      end = endOfWeek(subDays(now, 7));
      break;
    case 'thisMonth':
      start = startOfMonth(now);
      end = endOfMonth(now);
      break;
    case 'lastMonth':
      start = startOfMonth(subMonths(now, 1));
      end = endOfMonth(subMonths(now, 1));
      break;
    case 'thisYear':
      start = startOfYear(now);
      end = endOfYear(now);
      break;
    case 'lastYear':
      start = startOfYear(subYears(now, 1));
      end = endOfYear(subYears(now, 1));
      break;
    default:
      start = startOfDay(now);
      end = endOfDay(now);
  }

  return { start, end };
}

export function getDaysBetween(start: Date | string, end: Date | string): number {
  const startDate = typeof start === 'string' ? parseISO(start) : start;
  const endDate = typeof end === 'string' ? parseISO(end) : end;
  if (!isValid(startDate) || !isValid(endDate)) return 0;
  return differenceInDays(endDate, startDate);
}

export function getHoursBetween(start: Date | string, end: Date | string): number {
  const startDate = typeof start === 'string' ? parseISO(start) : start;
  const endDate = typeof end === 'string' ? parseISO(end) : end;
  if (!isValid(startDate) || !isValid(endDate)) return 0;
  return differenceInHours(endDate, startDate);
}

export function getMinutesBetween(start: Date | string, end: Date | string): number {
  const startDate = typeof start === 'string' ? parseISO(start) : start;
  const endDate = typeof end === 'string' ? parseISO(end) : end;
  if (!isValid(startDate) || !isValid(endDate)) return 0;
  return differenceInMinutes(endDate, startDate);
}

export function isValidDate(date: any): boolean {
  if (!date) return false;
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return isValid(parsedDate);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatNumber(num: number): string {
  if (num < 1000) return num.toString();
  if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
  if (num < 1000000000) return (num / 1000000).toFixed(1) + 'M';
  return (num / 1000000000).toFixed(1) + 'B';
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return '(' + match[1] + ') ' + match[2] + '-' + match[3];
  }
  return phone;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function capitalizeFirstLetter(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function toSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateId(length: number = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomElement<T>(array: T[]): T | undefined {
  if (array.length === 0) return undefined;
  return array[Math.floor(Math.random() * array.length)];
}

export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

export function sortBy<T>(array: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

export function paginate<T>(array: T[], page: number, limit: number): T[] {
  const start = (page - 1) * limit;
  const end = start + limit;
  return array.slice(start, end);
}

export function isInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      resolve();
    } catch (err) {
      reject(err);
    } finally {
      document.body.removeChild(textarea);
    }
  });
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getColorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

export function getContrastColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#000000';
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(c => Math.round(c).toString(16).padStart(2, '0')).join('');
}

export function darkenHex(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.max(0, rgb.r - amount);
  const g = Math.max(0, rgb.g - amount);
  const b = Math.max(0, rgb.b - amount);
  return rgbToHex(r, g, b);
}

export function lightenHex(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.min(255, rgb.r + amount);
  const g = Math.min(255, rgb.g + amount);
  const b = Math.min(255, rgb.b + amount);
  return rgbToHex(r, g, b);
}

export function combineClassNames(...classNames: (string | undefined | null | false)[]): string {
  return classNames.filter(Boolean).join(' ');
}
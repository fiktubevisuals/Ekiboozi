/**
 * Date, view, and subscriber formatting utilities
 */

export function getClientId(): string {
  try {
    let id = localStorage.getItem('ekiboozi_client_id');
    if (!id) {
      id = 'client_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      localStorage.setItem('ekiboozi_client_id', id);
    }
    return id;
  } catch {
    return 'client_session_' + Date.now();
  }
}

/**
 * Robustly parses any date input (Date, timestamp, Firestore Timestamp, ISO string, object) into a valid Date
 */
export function parseToDate(dateInput?: unknown): Date | null {
  if (!dateInput) return null;
  try {
    if (dateInput instanceof Date) {
      return isNaN(dateInput.getTime()) ? null : dateInput;
    }
    if (typeof dateInput === 'number') {
      const d = new Date(dateInput);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof dateInput === 'string') {
      const d = new Date(dateInput);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof dateInput === 'object' && dateInput !== null) {
      const obj = dateInput as Record<string, any>;
      if (typeof obj.toDate === 'function') {
        const d = obj.toDate();
        if (d instanceof Date && !isNaN(d.getTime())) return d;
      }
      if (typeof obj.toMillis === 'function') {
        const d = new Date(obj.toMillis());
        if (!isNaN(d.getTime())) return d;
      }
      if (typeof obj.seconds === 'number') {
        const d = new Date(obj.seconds * 1000);
        if (!isNaN(d.getTime())) return d;
      }
      if (typeof obj._seconds === 'number') {
        const d = new Date(obj._seconds * 1000);
        if (!isNaN(d.getTime())) return d;
      }
      if (typeof obj.getTime === 'function') {
        const d = new Date(obj.getTime());
        if (!isNaN(d.getTime())) return d;
      }
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Returns milliseconds timestamp safely, returning 0 if invalid
 */
export function getTimeMillis(dateInput?: unknown): number {
  const d = parseToDate(dateInput);
  return d ? d.getTime() : 0;
}

export function formatRelativeTime(dateInput?: unknown): string {
  if (!dateInput) return 'Just now';

  // If already relative like "Just now", "2 hours ago", "LIVE NOW", return as is
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (
      trimmed.toLowerCase() === 'just now' ||
      trimmed.toLowerCase().includes('ago') ||
      trimmed.toLowerCase().includes('live')
    ) {
      return trimmed;
    }
  }

  const date = parseToDate(dateInput);
  if (!date) {
    return typeof dateInput === 'string' ? dateInput : 'Recently';
  }

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 0 || diffSec < 45) return 'Just now';
  if (diffSec < 3600) {
    const mins = Math.max(1, Math.floor(diffSec / 60));
    return `${mins}m ago`;
  }
  if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    return `${hours}h ago`;
  }
  if (diffSec < 604800) {
    const days = Math.floor(diffSec / 86400);
    return days === 1 ? 'Yesterday' : `${days}d ago`;
  }
  if (diffSec < 2592000) {
    const weeks = Math.floor(diffSec / 604800);
    return `${weeks}w ago`;
  }
  if (diffSec < 31536000) {
    const months = Math.floor(diffSec / 2592000);
    return `${months}mo ago`;
  }
  const years = Math.floor(diffSec / 31536000);
  return `${years}y ago`;
}

export function formatPublishDate(dateInput?: unknown): string {
  if (!dateInput) return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const date = parseToDate(dateInput);
  if (!date) {
    return typeof dateInput === 'string' ? dateInput : 'Recently';
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatViewCount(count?: number | null, viewsStr?: string): string {
  if (typeof count === 'number' && !isNaN(count)) {
    if (count === 0) return '0 views';
    if (count === 1) return '1 view';
    return `${new Intl.NumberFormat('en-US', { notation: 'compact' }).format(count)} views`;
  }

  if (viewsStr) {
    const num = parseInt(viewsStr.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(num)) {
      if (num === 0) return '0 views';
      if (num === 1) return '1 view';
      return `${new Intl.NumberFormat('en-US', { notation: 'compact' }).format(num)} views`;
    }
    return viewsStr.includes('view') ? viewsStr : `${viewsStr} views`;
  }

  return '0 views';
}

export function formatSubscriberCount(count?: number | null): string {
  if (typeof count !== 'number' || isNaN(count) || count < 0) return '0';
  if (count < 1000) return count.toString();
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(count);
}

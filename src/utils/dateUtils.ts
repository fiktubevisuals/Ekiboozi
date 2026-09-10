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

export function formatRelativeTime(dateInput?: string | number | Date | null): string {
  if (!dateInput) return 'Just now';

  // If already relative like "Just now", "2 hours ago", return as is
  if (typeof dateInput === 'string' && (dateInput.includes('ago') || dateInput.toLowerCase() === 'just now')) {
    return dateInput;
  }

  let date: Date;
  if (typeof dateInput === 'number') {
    date = new Date(dateInput);
  } else if (typeof dateInput === 'string') {
    date = new Date(dateInput);
  } else {
    date = dateInput;
  }

  if (isNaN(date.getTime())) {
    return typeof dateInput === 'string' ? dateInput : 'Recently';
  }

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 45) return 'Just now';
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

export function formatPublishDate(dateInput?: string | number | Date | null): string {
  if (!dateInput) return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  let date: Date;
  if (typeof dateInput === 'number') {
    date = new Date(dateInput);
  } else if (typeof dateInput === 'string') {
    date = new Date(dateInput);
  } else {
    date = dateInput;
  }

  if (isNaN(date.getTime())) {
    return String(dateInput);
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

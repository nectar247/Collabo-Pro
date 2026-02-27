import { Timestamp } from 'firebase/firestore';

function toDate(timestamp: Timestamp | Date | null | undefined): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  return timestamp.toDate();
}

// Returns human-friendly relative time: "just now", "2m ago", "3h ago", "Yesterday", "Mon", "Jan 5"
export function formatRelativeTime(timestamp: Timestamp | Date | null | undefined): string {
  const date = toDate(timestamp);
  if (!date) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Returns "2:34 PM"
export function formatTime(timestamp: Timestamp | Date | null | undefined): string {
  const date = toDate(timestamp);
  if (!date) return '';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// Returns "January 5, 2025"
export function formatDate(timestamp: Timestamp | Date | null | undefined): string {
  const date = toDate(timestamp);
  if (!date) return '';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * DateUtils.ts - Date formatting utilities
 *
 * This file provides utility functions for date formatting and manipulation.
 */
/**
 * Gets the current timestamp in ISO format
 * @returns Current timestamp as ISO string
 */
export function getCurrentTimestamp() {
    return new Date().toISOString();
}
/**
 * Formats a date for display in logs or UI
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDateForDisplay(date) {
    return date.toLocaleString();
}
/**
 * Parses an ISO timestamp string to Date
 * @param timestamp - ISO timestamp string
 * @returns Date object
 */
export function parseTimestamp(timestamp) {
    return new Date(timestamp);
}
/**
 * Gets a human-readable time difference
 * @param timestamp - ISO timestamp string
 * @returns Human-readable time difference (e.g., "2 hours ago")
 */
export function getTimeAgo(timestamp) {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }
    else if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    else if (minutes > 0) {
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    else {
        return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
    }
}

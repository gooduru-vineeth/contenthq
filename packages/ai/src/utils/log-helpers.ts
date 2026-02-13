/**
 * Utility functions for logging across AI services and pipeline workers.
 */

/**
 * Truncate text for log display, appending "..." if truncated.
 */
export function truncateForLog(text: string | undefined | null, maxLength = 200): string {
  if (!text) return "(empty)";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

/**
 * Format byte count as human-readable file size (e.g., "1.2 MB").
 */
export function formatFileSize(bytes: number | undefined | null): string {
  if (bytes == null || bytes < 0) return "unknown";
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

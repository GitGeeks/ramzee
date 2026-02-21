/**
 * Extract Ram Tags from bleat content
 */
export function extractRamTags(content: string): string[] {
  const regex = /#([a-zA-Z0-9_]+)/g;
  const matches = content.match(regex);
  if (!matches) return [];
  return [...new Set(matches.map((tag) => tag.slice(1)))];
}

/**
 * Extract mentions from bleat content
 */
export function extractMentions(content: string): string[] {
  const regex = /@([a-zA-Z0-9_]+)/g;
  const matches = content.match(regex);
  if (!matches) return [];
  return [...new Set(matches.map((mention) => mention.slice(1)))];
}

/**
 * Validate URI email format
 */
export function isValidUriEmail(email: string): boolean {
  const regex = /^[a-zA-Z0-9._%+-]+@uri\.edu$/i;
  return regex.test(email);
}

/**
 * Validate username format (alphanumeric, 3-30 chars)
 */
export function isValidUsername(username: string): boolean {
  const regex = /^[a-zA-Z0-9_]{3,30}$/;
  return regex.test(username);
}

/**
 * Validate bleat content length
 */
export function isValidBleatContent(content: string): boolean {
  return content.length > 0 && content.length <= 280;
}

/**
 * Generate a random 6-digit verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Format relative time (e.g., "2m ago", "1h ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;
  if (diffDay < 7) return `${diffDay}d`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

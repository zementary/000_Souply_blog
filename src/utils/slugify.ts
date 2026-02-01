/**
 * Convert a string to a URL-safe slug
 * Examples:
 *   "Aube Perrie" → "aube-perrie"
 *   "Dave Free & Kendrick Lamar" → "dave-free-kendrick-lamar"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_]+/g, '-')  // Replace spaces/underscores with hyphens
    .replace(/--+/g, '-')     // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

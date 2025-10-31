/**
 * Sanitizes a string by replacing spaces and invalid HTTP characters with underscores
 *
 * Valid HTTP characters for URLs/headers are typically:
 * - Letters (a-z, A-Z)
 * - Numbers (0-9)
 * - Hyphens (-)
 * - Underscores (_)
 * - Period (.)
 *
 * This function replaces anything else with underscores and handles multiple
 * consecutive invalid characters by replacing them with a single underscore.
 *
 * @param input - The string to sanitize
 * @returns The sanitized string with invalid characters replaced by underscores
 */
export function sanitizeForHttp(input: string): string {
  if (!input) return '';

  return (
    input
      // Replace any character that is NOT a letter, number, hyphen, underscore, or period
      .replace(/[^a-zA-Z0-9\-_.]/g, '_')
      // Replace multiple consecutive underscores with a single underscore
      .replace(/_+/g, '_')
      // Remove leading/trailing underscores
      .replace(/^_+|_+$/g, '')
  );
}

/**
 * Sanitizes a string for use in URL paths (more restrictive)
 * Only allows letters, numbers, hyphens, and underscores
 *
 * @param input - The string to sanitize
 * @returns The sanitized string suitable for URL paths
 */
export function sanitizeForUrlPath(input: string): string {
  if (!input) return '';

  return (
    input
      // Replace any character that is NOT a letter, number, hyphen, or underscore
      .replace(/[^a-zA-Z0-9\-_]/g, '_')
      // Replace multiple consecutive underscores with a single underscore
      .replace(/_+/g, '_')
      // Remove leading/trailing underscores
      .replace(/^_+|_+$/g, '')
  );
}

/**
 * Sanitizes a string for use in HTTP headers (follows RFC 7230)
 * Header names can only contain tokens: letters, numbers, and specific symbols
 *
 * @param input - The string to sanitize for header names
 * @returns The sanitized string suitable for HTTP header names
 */
export function sanitizeForHttpHeader(input: string): string {
  if (!input) return '';

  return (
    input
      // Replace any character that is NOT a valid token character for HTTP headers
      // Valid: letters, numbers, and: !#$%&'*+-.^_`|~
      .replace(/[^a-zA-Z0-9!#$%&'*+\-.^_`|~]/g, '_')
      // Replace multiple consecutive underscores with a single underscore
      .replace(/_+/g, '_')
      // Remove leading/trailing underscores
      .replace(/^_+|_+$/g, '')
  );
}

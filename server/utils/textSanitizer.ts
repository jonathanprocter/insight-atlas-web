/**
 * Sanitize text to ensure it's safe for JSON serialization
 * Handles quotes, control characters, and other problematic characters
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';
  
  // Replace problematic characters that break JSON
  return text
    // Replace smart quotes with regular quotes
    .replace(/[\u2018\u2019]/g, "'")  // Smart single quotes
    .replace(/[\u201C\u201D]/g, '"')  // Smart double quotes
    // Replace other problematic Unicode characters
    .replace(/[\u2013\u2014]/g, '-')  // En dash, em dash
    .replace(/[\u2026]/g, '...')      // Ellipsis
    // Remove control characters (except newlines and tabs)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Ensure backslashes are escaped
    .replace(/\\/g, '\\\\')
    // Ensure quotes are properly handled (but don't double-escape)
    .replace(/(?<!\\)"/g, '\\"');
}

/**
 * Sanitize an object recursively, handling all string fields
 */
export function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeText(obj) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Sanitize sections array for safe JSON serialization
 */
export function sanitizeSections(sections: any[]): any[] {
  return sections.map(section => ({
    ...section,
    title: sanitizeText(section.title),
    content: sanitizeText(section.content),
    metadata: section.metadata ? sanitizeObject(section.metadata) : undefined
  }));
}

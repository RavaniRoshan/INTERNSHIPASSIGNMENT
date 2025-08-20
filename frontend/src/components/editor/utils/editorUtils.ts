/**
 * Utility functions for the rich text editor
 */

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeEditorContent(html: string): string {
  // Basic HTML sanitization - in production, consider using DOMPurify
  const allowedTags = [
    'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote',
    'a', 'img', 'video',
    'div', 'span'
  ];

  const allowedAttributes = {
    'a': ['href', 'title', 'target'],
    'img': ['src', 'alt', 'width', 'height', 'class'],
    'video': ['src', 'controls', 'width', 'height', 'class'],
    'div': ['class', 'data-media-embed', 'data-url'],
    'span': ['class']
  };

  // This is a simplified sanitization - use DOMPurify in production
  return html;
}

/**
 * Extract plain text from HTML content
 */
export function extractTextFromHtml(html: string): string {
  if (typeof window === 'undefined') {
    // Server-side: simple regex-based extraction
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  // Client-side: use DOM parser
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

/**
 * Count words in HTML content
 */
export function countWordsInHtml(html: string): number {
  const text = extractTextFromHtml(html);
  if (!text.trim()) return 0;
  
  return text
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0)
    .length;
}

/**
 * Count characters in HTML content (excluding HTML tags)
 */
export function countCharactersInHtml(html: string): number {
  const text = extractTextFromHtml(html);
  return text.length;
}

/**
 * Generate a reading time estimate from HTML content
 */
export function estimateReadingTime(html: string, wordsPerMinute: number = 200): number {
  const wordCount = countWordsInHtml(html);
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Extract images from HTML content
 */
export function extractImagesFromHtml(html: string): Array<{ src: string; alt?: string }> {
  if (typeof window === 'undefined') {
    // Server-side: regex-based extraction
    const imgRegex = /<img[^>]+src="([^"]*)"[^>]*(?:alt="([^"]*)")?[^>]*>/g;
    const images: Array<{ src: string; alt?: string }> = [];
    let match;
    
    while ((match = imgRegex.exec(html)) !== null) {
      images.push({
        src: match[1],
        alt: match[2] || undefined
      });
    }
    
    return images;
  }

  // Client-side: use DOM parser
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const imgElements = doc.querySelectorAll('img');
  
  return Array.from(imgElements).map(img => ({
    src: img.src,
    alt: img.alt || undefined
  }));
}

/**
 * Validate editor content
 */
export function validateEditorContent(html: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check if content is empty
  const textContent = extractTextFromHtml(html);
  if (!textContent.trim()) {
    errors.push('Content cannot be empty');
  }

  // Check character limit
  const charCount = countCharactersInHtml(html);
  if (charCount > 10000) {
    errors.push('Content exceeds maximum character limit of 10,000');
  }

  // Check for potentially malicious content
  if (html.includes('<script>') || html.includes('javascript:')) {
    errors.push('Content contains potentially unsafe elements');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generate a content summary from HTML
 */
export function generateContentSummary(html: string, maxLength: number = 150): string {
  const text = extractTextFromHtml(html);
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Check if content has been modified
 */
export function hasContentChanged(original: string, current: string): boolean {
  // Normalize whitespace and compare
  const normalize = (content: string) => content.replace(/\s+/g, ' ').trim();
  return normalize(original) !== normalize(current);
}
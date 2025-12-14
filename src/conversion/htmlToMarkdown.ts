/**
 * Turndown wrapper for HTML to Markdown conversion with GFM support
 */
import TurndownService from 'turndown';
// @ts-expect-error - turndown-plugin-gfm has incomplete type definitions
import { gfm } from 'turndown-plugin-gfm';
import { debug } from '../utils/logging';

// Create and configure Turndown service
let turndownService: TurndownService | undefined;

interface TurndownNode {
  getAttribute(name: string): string | null;
}

/**
 * Gets or creates the configured Turndown service instance.
 * @returns Configured TurndownService
 */
function getTurndownService(): TurndownService {
  if (!turndownService) {
    turndownService = new TurndownService({
      headingStyle: 'atx', // Use # for headings
      hr: '---',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      fence: '```',
      emDelimiter: '*',
      strongDelimiter: '**',
      linkStyle: 'inlined',
      preformattedCode: false, // Don't preserve HTML-formatted code
    });

    // Add GitHub Flavored Markdown support (tables, strikethrough, task lists)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    turndownService.use(gfm);

    // Ensure GFM tables have highest priority - configure for clean markdown output
    turndownService.addRule('gfmTables', {
      filter: ['table'],
      replacement: (content) => {
        // GFM plugin handles conversion, just ensure spacing
        return `\n\n${content}\n\n`;
      },
    });

    // Remove default image rule and add our custom one that encodes paths
    turndownService.remove('image');
    turndownService.addRule('encodedImages', {
      filter: 'img',
      replacement: (_content, node) => {
        const element = node as TurndownNode;
        const src = element.getAttribute('src') ?? '';
        const alt = element.getAttribute('alt') ?? '';
        const title = element.getAttribute('title');

        // The src may come already encoded or decoded depending on the source
        // First decode to normalize, then re-encode to ensure proper format
        let normalizedSrc: string;
        try {
          // Try to decode first (in case it's already encoded)
          normalizedSrc = decodeURIComponent(src);
        } catch {
          // If decode fails, it wasn't encoded
          normalizedSrc = src;
        }
        
        // Now encode each path segment properly for Markdown
        const encodedSrc = normalizedSrc
          .split('/')
          .map((segment) => encodeURIComponent(segment))
          .join('/');

        debug(`Image path encoded: "${src}" -> "${encodedSrc}"`);

        if (title) {
          return `![${alt}](${encodedSrc} "${title}")`;
        }
        return `![${alt}](${encodedSrc})`;
      },
    });

    // Preserve line breaks in paragraphs for better formatting
    turndownService.addRule('paragraph', {
      filter: 'p',
      replacement: (content) => {
        return `\n\n${content}\n\n`;
      },
    });

    debug('TurndownService initialized with GFM plugin');
  }

  return turndownService;
}

/**
 * Converts a heading text to a Markdown anchor ID.
 * Follows GitHub-style anchor generation.
 * @param text Heading text
 * @returns Anchor ID (lowercase, spaces to hyphens, special chars removed)
 */
function textToAnchor(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // spaces to hyphens
    .replace(/[^\w\-áéíóúñü]/g, '') // remove special chars (keep accented letters)
    .replace(/--+/g, '-')           // collapse multiple hyphens
    .replace(/^-|-$/g, '');         // trim leading/trailing hyphens
}

/**
 * Converts HTML to Markdown using Turndown with GFM support.
 * @param html HTML content to convert
 * @returns Markdown string
 */
export function htmlToMarkdown(html: string): string {
  if (!html || html.trim().length === 0) {
    debug('Empty HTML input, returning empty string');
    return '';
  }

  const service = getTurndownService();
  let markdown = service.turndown(html);

  // Post-process: Strip any remaining inline styles/attributes that Word Online may have left
  // Word Online sometimes embeds style attributes and spans that Turndown doesn't convert
  // Match: <span style="...">content</span>, <div style="...">content</div>, etc.
  markdown = markdown.replace(/<span[^>]*>([^<]*)<\/span>/gi, '$1');
  markdown = markdown.replace(/<div[^>]*>([^<]*)<\/div>/gi, '$1');
  
  // Strip Word-specific tags like <o:p></o:p>
  markdown = markdown.replace(/<o:[^>]+>/gi, '');
  markdown = markdown.replace(/<[!][^>]+>/gi, '');  // Strip conditional comments

  // Post-process: fix image syntax - encode paths and clean alt text
  // Matches ![alt](path) or ![alt](path "title") including multi-line alt text
  markdown = markdown.replace(
    /!\[([\s\S]*?)\]\(([^)"]+)(\s+"[^"]*")?\)/g,
    (_match, alt: string, path: string, title: string = '') => {
      // Clean alt text: replace newlines with spaces, collapse multiple spaces
      const cleanAlt = alt.replace(/\s+/g, ' ').trim();
      
      // Encode the path segments
      const encodedPath = path
        .split('/')
        .map((segment: string) => {
          // Don't double-encode if already encoded
          try {
            const decoded = decodeURIComponent(segment);
            return encodeURIComponent(decoded);
          } catch {
            return encodeURIComponent(segment);
          }
        })
        .join('/');
      
      debug(`Image: alt="${cleanAlt}", path="${encodedPath}"`);
      return `![${cleanAlt}](${encodedPath}${title})`;
    }
  );

  // Build a map of heading texts for TOC link fixing
  const headingMap = new Map<string, string>();
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  let match;
  while ((match = headingRegex.exec(markdown)) !== null) {
    const headingText = match[2].trim();
    const anchor = textToAnchor(headingText);
    // Store both the full text and potential partial matches
    headingMap.set(headingText.toLowerCase(), anchor);
  }

  // Fix TOC links: convert Word-style #_Toc... or #_heading... to proper anchors
  // Match links like [1 INTRODUCCIÓN 4](#_Toc123456) - leading number is section, trailing is page
  markdown = markdown.replace(
    /\[([^\]]+)\]\(#_[^)]+\)/g,
    (fullMatch, linkText: string) => {
      // Clean link text:
      // 1. Normalize whitespace
      // 2. Remove trailing page number (e.g., " 4" at end)
      // 3. Remove leading section number (e.g., "1 " or "1.2.3 " at start)
      const cleanLinkText = linkText
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\s+\d+$/, '')              // Remove trailing page number
        .replace(/^[\d.]+\s+/, '');          // Remove leading section number (1, 1.2, 1.2.3, etc.)
      
      const anchor = textToAnchor(cleanLinkText);
      
      if (anchor.length > 0) {
        debug(`TOC link fixed: "${linkText}" -> "[${cleanLinkText}](#${anchor})"`);
        return `[${cleanLinkText}](#${anchor})`;
      }
      
      // Keep original if no valid anchor
      return fullMatch;
    }
  );

  // Clean up excessive newlines
  const cleaned = markdown
    .replace(/\n{3,}/g, '\n\n') // Replace 3+ newlines with 2
    .trim();

  debug(`Converted HTML to Markdown: ${html.length} chars -> ${cleaned.length} chars`);

  return cleaned;
}

/**
 * Converts HTML to Markdown and wraps the result with metadata.
 * @param html HTML content to convert
 * @param title Optional title for the document
 * @returns Markdown string with optional frontmatter
 */
export function htmlToMarkdownWithMeta(html: string, title?: string): string {
  const markdown = htmlToMarkdown(html);

  if (title) {
    // Add title as H1 if provided
    return `# ${title}\n\n${markdown}`;
  }

  return markdown;
}

/**
 * Resets the Turndown service (useful for testing).
 */
export function resetTurndownService(): void {
  turndownService = undefined;
}

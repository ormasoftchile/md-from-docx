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
 * Converts an HTML table to GFM markdown format.
 * @param tableHtml HTML table element
 * @returns GFM markdown table or original HTML if parsing fails
 */
function convertHtmlTableToMarkdown(tableHtml: string): string {
  try {
    // Extract rows
    const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
    const rows = tableHtml.match(rowRegex) || [];
    
    if (rows.length === 0) {
      return tableHtml; // No rows found, return original
    }

    // Process each row
    const markdownRows = rows.map((row) => {
      // Extract cells (both th and td)
      const cellRegex = /<t[hd][^>]*>[\s\S]*?<\/t[hd]>/gi;
      const cells = row.match(cellRegex) || [];
      
      // Extract cell content and clean it
      const cellContents = cells.map((cell) => {
        // Remove the opening and closing tags
        const content = cell
          .replace(/<t[hd][^>]*>/i, '')
          .replace(/<\/t[hd]>/i, '')
          .trim()
          // Remove remaining HTML tags
          .replace(/<[^>]+>/g, '')
          // Clean whitespace
          .replace(/\s+/g, ' ')
          .trim();
        
        return content;
      });

      // Return pipe-separated cells
      return `| ${cellContents.join(' | ')} |`;
    });

    if (markdownRows.length === 0) {
      return tableHtml;
    }

    // Build the table with header separator
    const result = markdownRows[0] + '\n' +
                   '| ' + markdownRows[0].split('|').slice(1, -1).map(() => '---').join(' | ') + ' |' +
                   (markdownRows.length > 1 ? '\n' + markdownRows.slice(1).join('\n') : '');

    debug(`Converted HTML table to GFM markdown: ${tableHtml.length} chars -> ${result.length} chars`);
    return result;
  } catch (err) {
    debug(`Failed to convert HTML table: ${err instanceof Error ? err.message : 'Unknown error'}`);
    return tableHtml; // Return original on error
  }
}

/**
 * Detects and fixes heading levels based on Word-style numbering patterns.
 * Converts numbered outline structure (1, 1.1, 1.1.1) to proper heading levels.
 * @param markdown Markdown content with headings
 * @returns Markdown with corrected heading levels
 */
function fixHeadingLevelsFromNumbering(markdown: string): string {
  const lines = markdown.split('\n');
  const result: string[] = [];
  const headingLevels = new Map<string, number>(); // Store detected level for each heading

  for (const line of lines) {
    // Match headings like "# Title" or "## Title"
    const match = line.match(/^(#+)\s+(.+)$/);
    if (!match) {
      result.push(line);
      continue;
    }

    const currentHashes = match[1];
    const headingText = match[2].trim();

    // Check if heading starts with Word numbering pattern (1, 1.1, 1.2, 1.1.1, etc.)
    const numberMatch = headingText.match(/^([\d.]+)\s+(.+)$/);
    if (numberMatch) {
      const numbering = numberMatch[1];
      const title = numberMatch[2];
      const parts = numbering.split('.');
      
      // Determine heading level from numbering depth
      // 1 -> H1 (#), 1.1 -> H2 (##), 1.1.1 -> H3 (###), etc.
      const targetLevel = parts.length;
      const targetHashes = '#'.repeat(Math.min(targetLevel, 6)); // Cap at H6

      // Store this mapping for consistency
      headingLevels.set(headingText, targetLevel);

      if (currentHashes !== targetHashes) {
        debug(`Adjusted heading level: "${numbering} ${title}" from ${currentHashes.length} to ${targetLevel}`);
        result.push(`${targetHashes} ${headingText}`);
      } else {
        result.push(line);
      }
    } else {
      result.push(line);
    }
  }

  return result.join('\n');
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

  // Normalize line endings to \n before processing
  // Word Online and clipboard often have mixed \r\n, \r, or \n
  let normalizedHtml = html
    .replace(/\r\n/g, '\n')  // Windows CRLF → LF
    .replace(/\r/g, '\n');   // Old Mac CR → LF

  const service = getTurndownService();
  let markdown = service.turndown(normalizedHtml);

  // Post-process: Strip only Word Online-specific artifacts, not general HTML
  // These are specific to Word's clipboard HTML encoding that Turndown doesn't handle
  
  // Strip Word-specific XML namespaced tags like <o:p></o:p>, <v:shapetype>, etc.
  markdown = markdown.replace(/<[ov]:[^>]+>/gi, '');
  
  // Strip conditional comments from Word: <!--[if gte mso X]>...<![endif]-->
  markdown = markdown.replace(/<!--\[if[^>]+\]>[\s\S]*?<!\[endif\]-->/gi, '');
  
  // Strip style attribute content but preserve the text
  // Only for span/div when they're purely for styling (contain only style attribute)
  markdown = markdown.replace(/<(span|div)\s+style="[^"]*">\s*([^<]*?)\s*<\/\1>/gi, '$2');

  // Convert any remaining HTML tables to GFM markdown
  // This catches tables that Turndown didn't convert
  markdown = markdown.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, (tableHtml) => {
    return convertHtmlTableToMarkdown(tableHtml);
  });

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
  // Remove these TOC links entirely since they don't work in markdown
  markdown = markdown.replace(/\[([^\]]+)\]\(#_[^)]+\)/g, '');

  // Detect and fix heading levels from numbered outlines
  // Word numbered lists (1, 1.1, 1.1.1) need to map to heading levels (H1, H2, H3)
  markdown = fixHeadingLevelsFromNumbering(markdown);

  // Clean up excessive newlines and blank lines
  const cleaned = markdown
    .replace(/\n{3,}/g, '\n\n')      // Replace 3+ newlines with 2
    .replace(/^\s*\n/gm, '')         // Remove blank lines at start of doc
    .replace(/\n\s*$/gm, '')         // Remove blank lines at end
    .split('\n')
    .filter((line) => line.trim() !== '')  // Remove completely empty lines
    .join('\n')
    .replace(/\n\n\n+/g, '\n\n')     // Final pass: max 2 newlines
    .replace(/\r\n/g, '\n')           // Ensure consistent LF line endings
    .replace(/\r/g, '\n')
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

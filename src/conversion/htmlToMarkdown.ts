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

    // Override heading conversion to respect HTML heading levels
    // Word Online might output Heading 2 as <h1>, so we need to track styles
    turndownService.remove('heading');
    turndownService.addRule('headings', {
      filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      replacement: (content, node) => {
        const element = node as unknown as { nodeName?: string };
        const tagName = element.nodeName?.toLowerCase() || 'h1';
        // Extract heading level from tag name (h1 -> 1, h2 -> 2, etc.)
        const level = parseInt(tagName.charAt(1), 10);
        const hashes = '#'.repeat(Math.min(level, 6)); // Cap at H6
        return `\n\n${hashes} ${content}\n\n`;
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

    // Handle superscript elements (footnote references)
    // Convert <sup>1</sup> to [^1] for markdown footnote syntax
    turndownService.addRule('superscript', {
      filter: 'sup',
      replacement: (content) => {
        // If it's a number, treat it as a footnote reference
        const trimmed = content.trim();
        if (/^\d+$/.test(trimmed)) {
          return `[^${trimmed}]`;
        }
        // Otherwise preserve as superscript using HTML or just inline
        return `^${trimmed}^`;
      },
    });

    // Handle subscript elements
    turndownService.addRule('subscript', {
      filter: 'sub',
      replacement: (content) => {
        return `~${content.trim()}~`;
      },
    });

    // Handle metric cards and similar styled divs from Loop/Teams
    // Convert them to blockquotes or info boxes
    turndownService.addRule('metricCards', {
      filter: (node) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (node.nodeName !== 'DIV') return false;
        const className = (node as unknown as TurndownNode).getAttribute('class') || '';
        return className.includes('metric-card') || 
               className.includes('insight-card') ||
               className.includes('card');
      },
      replacement: (content) => {
        // Format as a blockquote to preserve the card-like appearance
        const lines = content.trim().split('\n').filter(line => line.trim());
        const formatted = lines.map(line => `> ${line.trim()}`).join('\n');
        return `\n\n${formatted}\n\n`;
      },
    });

    // Handle metric containers - just pass through their children
    turndownService.addRule('metricContainers', {
      filter: (node) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (node.nodeName !== 'DIV') return false;
        const className = (node as unknown as TurndownNode).getAttribute('class') || '';
        return className.includes('metrics-container') || 
               className.includes('insights-container');
      },
      replacement: (content) => {
        return `\n\n${content.trim()}\n\n`;
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
 * Pre-processes HTML to remove Word-specific artifacts before conversion.
 * Preserves images and meaningful content while removing styling noise.
 * @param html Raw HTML from clipboard
 * @returns Cleaned HTML ready for Turndown
 */
function preprocessHtml(html: string): string {
  let cleaned = html;

  // Remove entire <head> section (contains Word styles and metadata)
  cleaned = cleaned.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');

  // Remove <style> tags and their content
  cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove non-image HTML comments (Word puts style definitions in comments)
  // But preserve conditional comments that might contain VML images
  // Pattern: keep <!--[if...]>...<![endif]--> that contain v:image or v:shape with image
  cleaned = cleaned.replace(/<!--(?!\[if)[\s\S]*?-->/g, '');

  // Remove <meta> tags
  cleaned = cleaned.replace(/<meta[^>]*>/gi, '');

  // Remove <link> tags (stylesheets)
  cleaned = cleaned.replace(/<link[^>]*>/gi, '');

  // Remove XML namespace declarations and processing instructions
  cleaned = cleaned.replace(/<\?xml[^>]*\?>/gi, '');
  cleaned = cleaned.replace(/xmlns[^=]*="[^"]*"/gi, '');

  // Remove Word-specific XML tags EXCEPT those containing images
  // Keep v:imagedata, v:shape with imagedata, o:OLEObject (embedded objects)
  // Remove empty v:shapetype, w:* formatting tags
  cleaned = cleaned.replace(/<w:[^>]+>[\s\S]*?<\/w:[^>]+>/gi, '');
  cleaned = cleaned.replace(/<w:[^>]*\/>/gi, '');
  cleaned = cleaned.replace(/<\/?w:[^>]*>/gi, '');
  
  // Remove v:shapetype definitions (templates, not actual content)
  cleaned = cleaned.replace(/<v:shapetype[^>]*>[\s\S]*?<\/v:shapetype>/gi, '');
  
  // Remove o:p (paragraph markers) but keep o:OLEObject
  cleaned = cleaned.replace(/<o:p[^>]*>[\s\S]*?<\/o:p>/gi, '');
  cleaned = cleaned.replace(/<o:p[^>]*\/>/gi, '');

  // Remove class and style attributes that are Word-specific (Mso*)
  cleaned = cleaned.replace(/\s+class="[^"]*Mso[^"]*"/gi, '');
  cleaned = cleaned.replace(/\s+style="[^"]*mso-[^"]*"/gi, '');

  // Clean up empty style attributes
  cleaned = cleaned.replace(/\s+style=""/gi, '');
  cleaned = cleaned.replace(/\s+class=""/gi, '');

  debug(`Preprocessed HTML: ${html.length} chars -> ${cleaned.length} chars`);
  return cleaned;
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

  // Decode HTML entities that are double-encoded HTML tags from Loop/Teams
  // Only decode if we detect escaped HTML tag patterns (e.g., &lt;div class=&quot;)
  // This preserves literal text like &lt;tag&gt; in normal content
  if (/&lt;(div|span|style|table|ul|ol|details)\s+(class|id|style)=&quot;/i.test(normalizedHtml)) {
    debug('Detected escaped HTML tags from Loop/Teams, decoding entities');
    normalizedHtml = normalizedHtml
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&amp;(?!lt;|gt;|quot;|amp;|nbsp;)/g, '&');  // Don't decode entity references
    
    // Convert Loop metric cards to markdown BEFORE Turndown
    // Pattern: <div class="metric-card">...<h4>Title</h4>...<div class="metric-card-value">VALUE</div>...<p>Description</p>...</div>
    normalizedHtml = normalizedHtml.replace(
      /<div[^>]*class="[^"]*metric-card[^"]*"[^>]*>[\s\S]*?<h4>([^<]+)<\/h4>[\s\S]*?<div[^>]*class="[^"]*metric-card-value[^"]*"[^>]*>([^<]+)<\/div>[\s\S]*?<p>([^<]+)<\/p>[\s\S]*?<\/div>/gi,
      (_match: string, title: string, value: string, description: string) => {
        return `<blockquote><strong>${title.trim()}</strong><br/><span style="font-size:2em">${value.trim()}</span><br/><em>${description.trim()}</em></blockquote>`;
      }
    );
    
    // Remove the metrics-container wrapper
    normalizedHtml = normalizedHtml.replace(/<div[^>]*class="[^"]*metrics-container[^"]*"[^>]*>/gi, '');
    normalizedHtml = normalizedHtml.replace(/<\/div>\s*<\/body>\s*<\/html>"\s*>/gi, '');
    
    // Remove any remaining style tags that got decoded
    normalizedHtml = normalizedHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Remove body/html wrappers that might have appeared
    normalizedHtml = normalizedHtml.replace(/<\/?body[^>]*>/gi, '');
    normalizedHtml = normalizedHtml.replace(/<\/?html[^>]*>/gi, '');
  }

  // Pre-process to remove Word artifacts
  normalizedHtml = preprocessHtml(normalizedHtml);

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

  // Clean up excessive newlines while preserving paragraph breaks
  const cleaned = markdown
    .replace(/\n{4,}/g, '\n\n\n')     // Replace 4+ newlines with 3 (one blank line)
    .replace(/^\s*\n/, '')            // Remove blank lines at start of doc
    .replace(/\n\s*$/, '')            // Remove blank lines at end
    .replace(/\n{3,}/g, '\n\n')       // Final pass: max 2 newlines (one blank line)
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

/**
 * Turndown wrapper for HTML to Markdown conversion with GFM support
 */
import TurndownService from 'turndown';
// @ts-expect-error - turndown-plugin-gfm has incomplete type definitions
import { gfm } from 'turndown-plugin-gfm';
import { debug } from '../utils/logging';
import type { PreprocessorConfig, PreprocessResult } from '../types';

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

    // Handle TL;DR cards from Loop/Teams - convert to blockquotes
    turndownService.addRule('tldrCards', {
      filter: (node) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (node.nodeName !== 'DIV') return false;
        const className = (node as unknown as TurndownNode).getAttribute('class') || '';
        return className.includes('tldr-card');
      },
      replacement: (content) => {
        // Format as a blockquote to preserve the card-like appearance
        const lines = content.trim().split('\n').filter(line => line.trim());
        const formatted = lines.map(line => `> ${line.trim()}`).join('\n');
        return `\n${formatted}\n`;
      },
    });

    // Handle TL;DR container - renders as a callout box
    turndownService.addRule('tldrContainer', {
      filter: (node) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (node.nodeName !== 'DIV') return false;
        const className = (node as unknown as TurndownNode).getAttribute('class') || '';
        return className.includes('tldr-container');
      },
      replacement: (content) => {
        return `\n\n${content.trim()}\n\n`;
      },
    });

    // Handle metric cards and similar styled divs from Loop/Teams
    // Convert them to blockquotes or info boxes
    turndownService.addRule('metricCards', {
      filter: (node) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (node.nodeName !== 'DIV') return false;
        const className = (node as unknown as TurndownNode).getAttribute('class') || '';
        return className.includes('metric-card');
      },
      replacement: (content) => {
        // Format as a blockquote to preserve the card-like appearance
        const lines = content.trim().split('\n').filter(line => line.trim());
        const formatted = lines.map(line => `> ${line.trim()}`).join('\n');
        return `\n\n${formatted}\n\n`;
      },
    });

    // Handle insight cards - these have icon + h4 + p structure
    // We need to combine the icon with the heading on the same line
    turndownService.addRule('insightCards', {
      filter: (node) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (node.nodeName !== 'DIV') return false;
        const className = (node as unknown as TurndownNode).getAttribute('class') || '';
        return className.includes('insight-card');
      },
      replacement: (content) => {
        // Content arrives as: emoji \n\n #### Title \n\n description
        // We need to combine emoji with title as: emoji **Title**
        const lines = content.trim().split('\n').filter(line => line.trim());
        const result: string[] = [];
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // Check if this is an emoji-only line (1-4 chars)
          // Emojis can be 1-4 chars due to combining characters
          const isEmojiLine = line.length <= 4 && !/^[a-zA-Z0-9#]/.test(line);
          
          if (isEmojiLine) {
            // Look ahead for the next h4 heading (#### ...)
            for (let j = i + 1; j < lines.length; j++) {
              const nextLine = lines[j].trim();
              if (nextLine.startsWith('####')) {
                // Found heading - combine emoji with title as bold
                const title = nextLine.replace(/^#{1,6}\s*/, '');
                result.push(`${line} **${title}**`);
                i = j; // Skip to after the heading
                break;
              } else if (nextLine.length > 0 && !nextLine.startsWith('#')) {
                // Hit non-heading content, just add emoji alone
                result.push(line);
                break;
              }
            }
          } else if (line.startsWith('####')) {
            // Standalone heading without preceding emoji - convert to bold
            const title = line.replace(/^#{1,6}\s*/, '');
            result.push(`**${title}**`);
          } else {
            // Regular content (description paragraph)
            result.push(line);
          }
        }
        
        const formatted = result.map(line => `> ${line}`).join('\n');
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
 * Detects orphaned data:image/* URIs in Markdown image references and replaces
 * them with a placeholder (FR-011).
 * 
 * @param markdown - Markdown content to scan
 * @returns OrphanDataUriResult with cleaned Markdown and orphan details
 */
export function detectOrphanDataUris(markdown: string): import('../types').OrphanDataUriResult {
  const orphans: import('../types').OrphanDataUriResult['orphans'] = [];
  const dataUriPattern = /!\[([^\]]*)\]\((data:image\/([^;]+);[^)]{100,})\)/g;

  const cleaned = markdown.replace(dataUriPattern, (match, alt: string, dataUri: string, mimeSubType: string, offset: number) => {
    orphans.push({
      position: offset,
      mimeType: `image/${mimeSubType}`,
      approximateSize: Math.round(dataUri.length * 0.75), // base64 → byte estimate
    });
    debug(`Orphan data URI detected at position ${offset}: image/${mimeSubType}, ~${Math.round(dataUri.length * 0.75)} bytes`);
    return `![${alt}](image-not-extracted)`;
  });

  return { markdown: cleaned, orphans };
}

/**
 * Converts a heading text to a Markdown anchor ID.
 * Follows GitHub-style anchor generation.
 * @param text Heading text
 * @returns Anchor ID (lowercase, spaces to hyphens, special chars removed)
 */
export function textToAnchor(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')              // spaces to hyphens
    .replace(/[^\p{L}\p{N}-]/gu, '')  // remove non-letter/non-digit/non-hyphen (full Unicode support, FR-009)
    .replace(/--+/g, '-')              // collapse multiple hyphens
    .replace(/^-|-$/g, '');            // trim leading/trailing hyphens
}

/**
 * Lightweight Turndown instance for converting cell HTML to Markdown (FR-007).
 * No GFM plugin, no custom rules — just basic inline conversion.
 */
let cellTurndownService: TurndownService | undefined;

function getCellTurndownService(): TurndownService {
  if (!cellTurndownService) {
    cellTurndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    });
  }
  return cellTurndownService;
}

/**
 * Finds outermost <table>...</table> blocks (handling nesting) and replaces each
 * with its GFM-converted equivalent.
 */
function replaceOutermostTables(input: string): string {
  let result = '';
  let i = 0;
  const lower = input.toLowerCase();

  while (i < input.length) {
    const openIdx = lower.indexOf('<table', i);
    if (openIdx === -1) {
      result += input.slice(i);
      break;
    }
    // Append everything before the <table
    result += input.slice(i, openIdx);

    // Find the matching </table> accounting for nesting
    let depth = 0;
    let j = openIdx;
    while (j < input.length) {
      const nextOpen = lower.indexOf('<table', j + 1);
      const nextClose = lower.indexOf('</table', j + (j === openIdx ? 1 : 0));

      if (nextClose === -1) {
        // No closing tag found — bail, append rest as-is
        result += input.slice(openIdx);
        return result;
      }

      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++;
        j = nextOpen;
      } else {
        if (depth === 0) {
          // Found the matching close
          const closeEnd = input.indexOf('>', nextClose + 7); // skip past </table>
          const tableHtml = input.slice(openIdx, closeEnd + 1);
          result += convertHtmlTableToMarkdown(tableHtml);
          i = closeEnd + 1;
          break;
        } else {
          depth--;
          j = nextClose + 1;
        }
      }
    }

    // Safety: if we didn't break (j exceeded length), bail
    if (j >= input.length) {
      result += input.slice(openIdx);
      break;
    }
  }

  return result;
}

/**
 * Converts an HTML table to GFM markdown format.
 * Uses a lightweight Turndown instance for cell content conversion (FR-007).
 * Normalizes column counts across rows (FR-008).
 * @param tableHtml HTML table element
 * @returns GFM markdown table or original HTML if parsing fails
 */
function convertHtmlTableToMarkdown(tableHtml: string): string {
  try {
    // Pre-flatten nested tables: replace inner <table>...</table> blocks with their cell text
    // This prevents the row regex from mismatching on nested </tr> tags.
    let flatHtml = tableHtml;
    // Iteratively flatten until no nested tables remain inside cells
    let prevHtml = '';
    while (prevHtml !== flatHtml) {
      prevHtml = flatHtml;
      flatHtml = flatHtml.replace(
        /(<t[hd][^>]*>[\s\S]*?)<table[^>]*>([\s\S]*?)<\/table>([\s\S]*?<\/t[hd]>)/gi,
        (_match, before: string, inner: string, after: string) => {
          // Extract text from inner table cells
          const cellTexts: string[] = [];
          const innerCellRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
          let cellMatch;
          while ((cellMatch = innerCellRegex.exec(inner)) !== null) {
            const text = cellMatch[1].replace(/<[^>]+>/g, '').trim();
            if (text) { cellTexts.push(text); }
          }
          return before + cellTexts.join(' ') + after;
        }
      );
    }

    // Extract rows
    const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
    const rows = flatHtml.match(rowRegex) || [];
    
    if (rows.length === 0) {
      return tableHtml; // No rows found, return original
    }

    const cellService = getCellTurndownService();

    // Process each row into arrays of cell contents
    const parsedRows: string[][] = rows.map((row) => {
      // Extract cells (both th and td)
      const cellRegex = /<t[hd][^>]*>[\s\S]*?<\/t[hd]>/gi;
      const cells = row.match(cellRegex) || [];
      
      const cellContents: string[] = [];
      for (const cell of cells) {
        // Detect colspan attribute (FR-008)
        const colspanMatch = cell.match(/colspan\s*=\s*["']?(\d+)["']?/i);
        const colspan = colspanMatch ? parseInt(colspanMatch[1], 10) : 1;

        // Extract inner HTML content
        const innerHtml = cell
          .replace(/<t[hd][^>]*>/i, '')
          .replace(/<\/t[hd]>/i, '')
          .trim();

        // Use lightweight Turndown for cell content (FR-007): preserves bold, italic, links, code
        let content: string;
        if (/<[^>]+>/.test(innerHtml)) {
          content = cellService.turndown(innerHtml)
            .replace(/\n+/g, ' ')   // Flatten newlines for table cells
            .replace(/\|/g, '\\|')  // Escape pipe characters in cell content
            .trim();
        } else {
          content = innerHtml
            .replace(/\s+/g, ' ')
            .replace(/\|/g, '\\|')
            .trim();
        }

        // Add the cell content
        cellContents.push(content);
        // Add empty cells for colspan > 1 (FR-008)
        for (let i = 1; i < colspan; i++) {
          cellContents.push('');
        }
      }

      return cellContents;
    });

    if (parsedRows.length === 0) {
      return tableHtml;
    }

    // Normalize column counts: find max and pad shorter rows (FR-008)
    const maxCols = Math.max(...parsedRows.map(r => r.length));
    const normalizedRows = parsedRows.map(row => {
      while (row.length < maxCols) {
        row.push('');
      }
      return row;
    });

    // Build GFM table
    const markdownRows = normalizedRows.map(row => `| ${row.join(' | ')} |`);
    const separator = `| ${Array(maxCols).fill('---').join(' | ')} |`;
    const result = markdownRows[0] + '\n' + separator +
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
      const parts = numbering.split('.').filter(p => p !== ''); // remove trailing empty from "1."
      
      // Exclude version-number patterns (FR-010):
      // - Any segment is "0" (e.g., "2.0", "1.0.0") — real outlines don't use 0
      // - More than 3 segments (e.g., "1.2.3.4") — likely a version/IP/ID
      // - Any segment has more than 2 digits (e.g., "3.14159") — not an outline
      const isVersionPattern = parts.length > 3 ||
        parts.some(p => p === '0' || p.length > 2);

      if (isVersionPattern) {
        // Treat as regular heading — don't adjust level
        result.push(line);
        continue;
      }

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
 * Default configuration for the HTML preprocessor.
 * All values reflect current behaviour; override for testing.
 */
export const DEFAULT_PREPROCESSOR_CONFIG: PreprocessorConfig = {
  dangerousTags: ['script', 'noscript', 'template', 'object', 'embed', 'applet'],
  unwrapTags: ['body'],
  discardWrapperTags: ['html', 'head'],
  stripNamespacePrefixes: ['w', 'o'],
  keepNamespacedTags: ['v:imagedata'],
  stripClassPrefixes: ['Mso'],
  stripStylePrefixes: ['mso-'],
};

/**
 * Pre-processes HTML to remove Word-specific artifacts before conversion.
 * Preserves images and meaningful content while removing styling noise.
 * @param html Raw HTML from clipboard
 * @param config Optional partial config override (merged with defaults)
 * @returns PreprocessResult with cleaned HTML and metadata
 */
function preprocessHtml(
  html: string,
  config?: Partial<PreprocessorConfig>,
): PreprocessResult {
  const cfg: PreprocessorConfig = { ...DEFAULT_PREPROCESSOR_CONFIG, ...config };
  let cleaned = html;
  let tagsRemoved = 0;
  let attributesStripped = 0;
  const warnings: string[] = [];

  // --- Dangerous tags: strip tag + content (FR-002) ---
  for (const tag of cfg.dangerousTags) {
    const re = new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>`, 'gi');
    cleaned = cleaned.replace(re, () => { tagsRemoved++; return ''; });
    // Self-closing variant
    const reSelf = new RegExp(`<${tag}[^>]*/?>`, 'gi');
    cleaned = cleaned.replace(reSelf, () => { tagsRemoved++; return ''; });
  }

  // --- Body extraction: unwrap <body>, discard <html>/<head> (FR-003) ---
  // Extract body content if present
  const bodyMatch = /<body[^>]*>([\s\S]*)<\/body>/i.exec(cleaned);
  if (bodyMatch) {
    cleaned = bodyMatch[1];
    tagsRemoved += 2; // body open + close
  }
  // Discard wrapper tags — only strip open/close tags, NOT matched pairs.
  // Matched-pair removal (e.g. <html>..content..</html>) is dangerous when
  // clipboard HTML has nested <html> tags (Teams/Loop), because the lazy
  // regex eats all content between the inner open tag and close tag.
  for (const tag of cfg.discardWrapperTags) {
    cleaned = cleaned.replace(new RegExp(`</?${tag}[^>]*>`, 'gi'), () => { tagsRemoved++; return ''; });
  }
  // Remove <!DOCTYPE ...>
  cleaned = cleaned.replace(/<!DOCTYPE[^>]*>/gi, '');

  // --- Remove <style> tags and their content ---
  cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, () => { tagsRemoved++; return ''; });

  // --- Remove non-image HTML comments ---
  cleaned = cleaned.replace(/<!--(?!\[if)[\s\S]*?-->/g, '');

  // --- Remove <meta> tags ---
  cleaned = cleaned.replace(/<meta[^>]*>/gi, () => { tagsRemoved++; return ''; });

  // --- Remove <link> tags (stylesheets) ---
  cleaned = cleaned.replace(/<link[^>]*>/gi, () => { tagsRemoved++; return ''; });

  // --- Remove XML namespace declarations and processing instructions ---
  cleaned = cleaned.replace(/<\?xml[^>]*\?>/gi, '');
  cleaned = cleaned.replace(/xmlns[^=]*="[^"]*"/gi, '');

  // --- Remove Word-specific XML namespaced tags (FR-004) ---
  for (const prefix of cfg.stripNamespacePrefixes) {
    // Full tags with content: <w:...>...</w:...>
    cleaned = cleaned.replace(new RegExp(`<${prefix}:[^>]+>[\\s\\S]*?</${prefix}:[^>]+>`, 'gi'), () => { tagsRemoved++; return ''; });
    // Self-closing: <w:.../>
    cleaned = cleaned.replace(new RegExp(`<${prefix}:[^>]*/>`, 'gi'), () => { tagsRemoved++; return ''; });
    // Orphan open/close tags: <w:...> or </w:...>
    cleaned = cleaned.replace(new RegExp(`</?${prefix}:[^>]*>`, 'gi'), () => { tagsRemoved++; return ''; });
  }

  // Remove v:shapetype definitions (templates, not actual content)
  cleaned = cleaned.replace(/<v:shapetype[^>]*>[\s\S]*?<\/v:shapetype>/gi, () => { tagsRemoved++; return ''; });

  // Remove o:p (paragraph markers) but keep o:OLEObject
  cleaned = cleaned.replace(/<o:p[^>]*>[\s\S]*?<\/o:p>/gi, () => { tagsRemoved++; return ''; });
  cleaned = cleaned.replace(/<o:p[^>]*\/>/gi, () => { tagsRemoved++; return ''; });

  // --- Strip Word-specific class and style attributes (FR-004) ---
  for (const prefix of cfg.stripClassPrefixes) {
    const re = new RegExp(`\\s+class="[^"]*${prefix}[^"]*"`, 'gi');
    cleaned = cleaned.replace(re, () => { attributesStripped++; return ''; });
  }
  for (const prefix of cfg.stripStylePrefixes) {
    const re = new RegExp(`\\s+style="[^"]*${prefix}[^"]*"`, 'gi');
    cleaned = cleaned.replace(re, () => { attributesStripped++; return ''; });
  }

  // Clean up empty style/class attributes
  cleaned = cleaned.replace(/\s+style=""/gi, '');
  cleaned = cleaned.replace(/\s+class=""/gi, '');

  debug(`Preprocessed HTML: ${html.length} chars -> ${cleaned.length} chars (removed ${tagsRemoved} tags, ${attributesStripped} attrs)`);
  return {
    html: cleaned,
    warnings,
    stats: { tagsRemoved, attributesStripped, entitiesDecoded: false },
  };
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

  // Extract content from iframe srcdoc attributes (Loop/Teams embeds content this way)
  // The srcdoc contains HTML-escaped content that we need to decode and inline
  // Use a more robust regex that handles very long srcdoc content
  normalizedHtml = normalizedHtml.replace(
    /<iframe[^>]*\ssrcdoc="([\s\S]*?)"[^>]*>[\s\S]*?<\/iframe>/gi,
    (_match: string, escapedContent: string) => {
      // Decode the HTML-escaped srcdoc content
      let decodedContent = escapedContent
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'");
      
      // Extract just the body content, stripping doctype/html/head/style
      const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(decodedContent);
      if (bodyMatch) {
        decodedContent = bodyMatch[1];
      }
      // Remove style tags from extracted content
      decodedContent = decodedContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      
      // Convert Loop insight cards at iframe extraction time
      // Pattern: <div class="insight-card"><span class="icon">EMOJI</span><h4>Title</h4><p>Description</p></div>
      decodedContent = decodedContent.replace(
        /<div[^>]*class="[^"]*insight-card[^"]*"[^>]*>\s*<span[^>]*class="[^"]*icon[^"]*"[^>]*>([^<]+)<\/span>\s*<h4>([^<]+)<\/h4>\s*<p>([\s\S]*?)<\/p>\s*<\/div>/gi,
        (_m: string, icon: string, title: string, description: string) => {
          // Decode HTML entities in content
          const decodeEntities = (s: string) => s
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
          return `<blockquote><strong>${icon.trim()} ${decodeEntities(title.trim())}</strong><br/>${decodeEntities(description.trim())}</blockquote>`;
        }
      );
      
      // Remove insights-container wrapper
      decodedContent = decodedContent.replace(/<div[^>]*class="[^"]*insights-container[^"]*"[^>]*>/gi, '');
      
      return decodedContent;
    }
  );

  // Decode HTML entities that are double-encoded HTML tags from Loop/Teams
  // Only decode if we detect escaped HTML tag patterns (e.g., &lt;div class=&quot;)
  // Generalized to any valid HTML tag name + recognized attribute (FR-006)
  if (/&lt;([a-z][a-z0-9]*)\s+(class|id|style|data-[a-z-]*)=&quot;/i.test(normalizedHtml)) {
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
    
    // Convert Loop insight cards to markdown BEFORE Turndown
    // Pattern: <div class="insight-card"><span class="icon">EMOJI</span><h4>Title</h4><p>Description</p></div>
    normalizedHtml = normalizedHtml.replace(
      /<div[^>]*class="[^"]*insight-card[^"]*"[^>]*>\s*<span[^>]*class="[^"]*icon[^"]*"[^>]*>([^<]+)<\/span>\s*<h4>([^<]+)<\/h4>\s*<p>([\s\S]*?)<\/p>\s*<\/div>/gi,
      (_match: string, icon: string, title: string, description: string) => {
        // Decode HTML entities in content
        const decodeEntities = (s: string) => s
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
        return `<blockquote><strong>${icon.trim()} ${decodeEntities(title.trim())}</strong><br/>${decodeEntities(description.trim())}</blockquote>`;
      }
    );
    
    // Remove the metrics-container and insights-container wrappers
    normalizedHtml = normalizedHtml.replace(/<div[^>]*class="[^"]*metrics-container[^"]*"[^>]*>/gi, '');
    normalizedHtml = normalizedHtml.replace(/<div[^>]*class="[^"]*insights-container[^"]*"[^>]*>/gi, '');
    normalizedHtml = normalizedHtml.replace(/<\/div>\s*<\/body>\s*<\/html>"\s*>/gi, '');
    
    // Remove any remaining style tags that got decoded
    normalizedHtml = normalizedHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Remove body/html wrappers that might have appeared
    normalizedHtml = normalizedHtml.replace(/<\/?body[^>]*>/gi, '');
    normalizedHtml = normalizedHtml.replace(/<\/?html[^>]*>/gi, '');
  }

  // Remove any remaining iframe elements (including those with srcdoc we've already extracted)
  normalizedHtml = normalizedHtml.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');
  normalizedHtml = normalizedHtml.replace(/<iframe[^>]*\/>/gi, '');

  // Pre-process to remove Word artifacts
  const preprocessResult = preprocessHtml(normalizedHtml);
  normalizedHtml = preprocessResult.html;

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
  // Use a function to find outermost tables (handles nested tables correctly)
  markdown = replaceOutermostTables(markdown);

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
  // Preserve the link text as plain text since these anchors don't work in markdown (FR-005)
  markdown = markdown.replace(/\[([^\]]+)\]\(#_[^)]+\)/g, '$1');

  // Detect and fix heading levels from numbered outlines
  // Word numbered lists (1, 1.1, 1.1.1) need to map to heading levels (H1, H2, H3)
  markdown = fixHeadingLevelsFromNumbering(markdown);

  // Detect and replace orphan data URIs (FR-011)
  const orphanResult = detectOrphanDataUris(markdown);
  markdown = orphanResult.markdown;
  if (orphanResult.orphans.length > 0) {
    debug(`Found ${orphanResult.orphans.length} orphan data URI(s) — replaced with placeholders`);
  }

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

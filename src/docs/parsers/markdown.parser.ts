import { marked, Tokens } from 'marked';
import type { ParsedSection } from './chunker';
import type { ParsedDocument } from './html.parser';

type MarkedToken = Tokens.Generic;

const GITBOOK_PATTERNS: Array<[RegExp, string]> = [
  [/\{%\s*hint[^%]*%\}([\s\S]*?)\{%\s*endhint\s*%\}/g, '$1'],
  [/\{%\s*tabs?\s*%\}([\s\S]*?)\{%\s*endtabs?\s*%\}/g, '$1'],
  [/\{%\s*tab\s+title="([^"]*)"\s*%\}/g, '\n#### $1\n'],
  [/\{%\s*endtab\s*%\}/g, ''],
  [/<figure>[\s\S]*?<\/figure>/g, ''],
  [/<table\s+data-view="cards">[\s\S]*?<\/table>/g, ''],
  [/\\\[/g, '['],
  [/\\]/g, ']'],
];

export function stripGitBookSyntax(raw: string): string {
  return GITBOOK_PATTERNS.reduce((acc, [re, rep]) => acc.replace(re, rep), raw);
}

export function parseMarkdown(raw: string): ParsedDocument {
  const cleaned = stripGitBookSyntax(raw);
  const tokens = marked.lexer(cleaned) as MarkedToken[];

  let title = '';
  let h1: string | null = null;
  let h2: string | null = null;
  let h4: string | null = null;
  const sections: ParsedSection[] = [];
  let buf: string[] = [];

  const flush = () => {
    const content = buf.join('\n\n').trim();
    if (content) {
      const headingParts = [h1, h2, h4].filter((p): p is string => !!p);
      const heading = headingParts.length > 0 ? headingParts.join(' > ') : null;
      sections.push({ h1, h2, heading, content });
    }
    buf = [];
  };

  for (const tok of tokens) {
    if (tok.type === 'heading') {
      const hTok = tok as Tokens.Heading;
      const text = hTok.text.trim();
      if (hTok.depth === 1) {
        if (!title) title = text;
        flush();
        h1 = text;
        h2 = null;
        h4 = null;
      } else if (hTok.depth === 2) {
        flush();
        h2 = text;
        h4 = null;
      } else if (hTok.depth === 3) {
        buf.push(`### ${text}`);
      } else if (hTok.depth === 4) {
        flush();
        h4 = text;
      } else {
        buf.push(`**${text}**`);
      }
    } else if (tok.type === 'paragraph') {
      buf.push((tok as Tokens.Paragraph).text);
    } else if (tok.type === 'list') {
      const listTok = tok as Tokens.List;
      buf.push(listTok.items.map((it) => `- ${it.text}`).join('\n'));
    } else if (tok.type === 'code') {
      const codeTok = tok as Tokens.Code;
      buf.push('```\n' + codeTok.text + '\n```');
    } else if (tok.type === 'blockquote') {
      buf.push((tok as Tokens.Blockquote).text ?? '');
    } else if (tok.type === 'table') {
      const t = tok as Tokens.Table;
      const headerRow = t.header.map((c) => c.text).join(' | ');
      const bodyRows = t.rows.map((r) => r.map((c) => c.text).join(' | '));
      buf.push([headerRow, ...bodyRows].join('\n'));
    } else if (tok.type === 'html') {
      // Strip raw HTML blocks — GitBook preprocessing handles common ones, the rest we skip.
      continue;
    }
  }
  flush();

  if (!title) title = 'Untitled';
  return { title, sections };
}

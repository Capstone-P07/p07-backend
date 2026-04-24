import type { ParsedSection } from './chunker';

export interface ParsedDocument {
  title: string;
  sections: ParsedSection[];
}

export function parseHtml(_raw: string): ParsedDocument {
  throw new Error('parseHtml is not implemented in this release. Use Markdown upload.');
}

export function parseUrl(_url: string): Promise<ParsedDocument> {
  throw new Error('parseUrl is not implemented in this release.');
}

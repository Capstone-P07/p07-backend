import { marked } from 'marked';
import { normalizeGitBook } from './gitbook-normalize';
import { htmlToSections } from './html-to-sections';
import type { ParsedDocument } from './html-to-sections';

// raw markdown 입력에 대한 진입점.
//   1. GitBook 확장/일부 raw HTML 을 plain markdown 으로 정규화
//   2. marked 로 HTML 변환 (GFM 표/코드/리스트 처리)
//   3. cheerio walker 로 ParsedDocument 추출
//
// HTML/URL 진입은 html.parser.ts 의 parseHtml 이 같은 cheerio 코어를 호출한다.
export function parseMarkdown(raw: string): ParsedDocument {
  const normalized = normalizeGitBook(raw);
  const html = marked.parse(normalized, { async: false, gfm: true }) as string;
  return htmlToSections(html);
}

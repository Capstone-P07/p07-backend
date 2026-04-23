import axios from 'axios';
import * as cheerio from 'cheerio';
import type { ParsedSection } from './chunker';

export async function parseUrl(url: string): Promise<{ title: string; sections: ParsedSection[] }> {
  const { data } = await axios.get<string>(url, {
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; P07-Bot/1.0)' },
  });
  return parseHtml(data);
}

export function parseHtml(html: string): { title: string; sections: ParsedSection[] } {
  const $ = cheerio.load(html);

  // 불필요한 요소 제거
  $('script, style, nav, header, footer, aside, [role="navigation"], .sidebar, .toc').remove();

  const title =
    $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';

  const sections: ParsedSection[] = [];
  let currentHeading: string | null = null;
  let currentContent: string[] = [];

  function flush() {
    const content = currentContent.join('\n\n').trim();
    if (content) {
      sections.push({ heading: currentHeading, content });
    }
    currentContent = [];
  }

  function walk(el: ReturnType<typeof $>[0]) {
    const tag = (el as any).tagName?.toLowerCase();
    if (!tag) return;

    if (['h1', 'h2', 'h3'].includes(tag)) {
      flush();
      currentHeading = $(el).text().trim();
    } else if (['p', 'li', 'blockquote', 'pre', 'td', 'dd'].includes(tag)) {
      const text = $(el).text().trim();
      if (text) currentContent.push(text);
    } else if (['div', 'section', 'article', 'main', 'ul', 'ol', 'table', 'tbody', 'tr'].includes(tag)) {
      $(el).children().each((_, child) => walk(child));
      return;
    }
  }

  const container = $('main, article, [role="main"], .docs-content, .content');
  const root = container.length ? container.first() : $('body');
  root.children().each((_, el) => walk(el));
  flush();

  // 헤딩 없이 텍스트만 있으면 전체 텍스트를 하나의 섹션으로
  if (sections.length === 0) {
    const text = root.text().trim();
    if (text) sections.push({ heading: null, content: text });
  }

  return { title, sections };
}

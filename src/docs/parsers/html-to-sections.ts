// HTML 문자열을 ParsedDocument 로 변환하는 코어.
//
// markdown 진입과 HTML(URL ingest) 진입이 같은 코어에 수렴한다:
//   parseMarkdown(md)  = htmlToSections(marked.parse(normalizeGitBook(md)))
//   parseHtml(html)    = htmlToSections(html)
//
// 동작:
//   1. cheerio 로 DOM 트리 빌드
//   2. body(있으면) 또는 root 의 자식들을 순서대로 walk
//   3. h1/h2 (와 h4) 만나면 섹션 boundary
//   4. 각 element 타입별 핸들러로 텍스트 추출 → 현재 섹션 buf 에 누적

import * as cheerio from 'cheerio';
import type { Cheerio, CheerioAPI } from 'cheerio';
import type { AnyNode, Element } from 'domhandler';
import type { ParsedSection } from './chunker';

export interface ParsedDocument {
  title: string;
  sections: ParsedSection[];
}

export function htmlToSections(html: string): ParsedDocument {
  const $ = cheerio.load(html);
  // body 가 비어 있으면 root() 를 사용. children().each 의 타입 통일을 위해 AnyNode 컨테이너로 본다.
  const rootContainer: Cheerio<AnyNode> =
    $('body').children().length > 0 ? ($('body') as Cheerio<AnyNode>) : ($.root() as Cheerio<AnyNode>);

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

  // top-level 만 walk. 안의 div/section 같은 wrapper 는 별도로 추출 후 buf 에 push.
  rootContainer.children().each((_, el) => {
    if (el.type !== 'tag') return;
    const $el = $(el);
    const tag = el.tagName.toLowerCase();

    switch (tag) {
      case 'h1': {
        const text = $el.text().trim();
        if (!title) title = text;
        flush();
        h1 = text;
        h2 = null;
        h4 = null;
        return;
      }
      case 'h2': {
        flush();
        h2 = $el.text().trim();
        h4 = null;
        return;
      }
      case 'h3': {
        // h3 는 섹션 boundary 가 아니라 본문 안의 sub-heading 으로 취급.
        buf.push(`### ${$el.text().trim()}`);
        return;
      }
      case 'h4': {
        flush();
        h4 = $el.text().trim();
        return;
      }
      case 'h5':
      case 'h6': {
        buf.push(`**${$el.text().trim()}**`);
        return;
      }
      case 'p':
      case 'blockquote': {
        const text = $el.text().trim();
        if (text) buf.push(text);
        return;
      }
      case 'ul':
      case 'ol': {
        const items = extractList($, $el);
        if (items) buf.push(items);
        return;
      }
      case 'pre': {
        const code = extractCode($el);
        if (code) buf.push(code);
        return;
      }
      case 'figure': {
        const text = extractFigure($, $el);
        if (text) buf.push(text);
        return;
      }
      case 'table': {
        const text = extractTable($, $el);
        if (text) buf.push(text);
        return;
      }
      case 'div':
      case 'section':
      case 'article': {
        // wrapper 안에 markdown 으로 변환된 element 가 들어올 수 있다 (특히
        // marked 가 generate 한 출력 보다는 GitBook 원본 HTML 에 흔함).
        // 안의 children 을 같은 처리로 누적.
        walkInto($, $el, buf);
        return;
      }
      case 'hr':
      case 'br':
        return;
      default: {
        // 인식 못하는 tag 도 텍스트만 회수해서 손실 방지.
        const text = $el.text().trim();
        if (text) buf.push(text);
      }
    }
  });
  flush();

  if (!title) title = 'Untitled';
  return { title, sections };
}

// ---------- helpers ----------

function walkInto($: CheerioAPI, $wrap: Cheerio<Element>, buf: string[]) {
  $wrap.children().each((_, child) => {
    if (child.type !== 'tag') return;
    const $c = $(child);
    const tag = child.tagName.toLowerCase();

    if (tag === 'p' || tag === 'blockquote') {
      const text = $c.text().trim();
      if (text) buf.push(text);
    } else if (tag === 'ul' || tag === 'ol') {
      const items = extractList($, $c);
      if (items) buf.push(items);
    } else if (tag === 'pre') {
      const code = extractCode($c);
      if (code) buf.push(code);
    } else if (tag === 'figure') {
      const text = extractFigure($, $c);
      if (text) buf.push(text);
    } else if (tag === 'table') {
      const text = extractTable($, $c);
      if (text) buf.push(text);
    } else if (tag === 'div' || tag === 'section' || tag === 'article') {
      walkInto($, $c, buf);
    } else if (/^h[1-6]$/.test(tag)) {
      // 깊게 들어간 헤딩은 sub-heading 으로 inline 표시 (섹션 boundary 영향 없음)
      buf.push(`### ${$c.text().trim()}`);
    } else {
      const text = $c.text().trim();
      if (text) buf.push(text);
    }
  });
}

function extractList($: CheerioAPI, $list: Cheerio<Element>): string {
  const items: string[] = [];
  $list.children('li').each((_, li) => {
    const text = $(li).text().trim();
    if (text) items.push(`- ${text}`);
  });
  return items.join('\n');
}

function extractCode($pre: Cheerio<Element>): string {
  const text = $pre.text();
  if (!text.trim()) return '';
  return '```\n' + text.replace(/\n+$/, '') + '\n```';
}

function extractFigure($: CheerioAPI, $fig: Cheerio<Element>): string {
  const caption = $fig.find('figcaption').text().trim();
  const alts: string[] = [];
  $fig.find('img').each((_, img) => {
    const a = $(img).attr('alt');
    if (a && a.trim()) alts.push(a.trim());
  });
  return [caption, ...alts].filter(Boolean).join(' ');
}

function extractTable($: CheerioAPI, $tbl: Cheerio<Element>): string {
  // GitBook 카드 테이블: 행마다 첫 td 가 설명, 둘째 td 가 라벨. markdown list 로.
  if ($tbl.attr('data-view') === 'cards') {
    const items: string[] = [];
    $tbl.find('tbody tr').each((_, tr) => {
      const cells = $(tr)
        .find('td')
        .map((__, td) => $(td).text().replace(/\s+/g, ' ').trim())
        .get()
        .filter((t) => t);
      if (cells.length > 0) {
        const desc = cells[0];
        const label = cells[1];
        items.push(label ? `- ${desc} (${label})` : `- ${desc}`);
      }
    });
    return items.join('\n');
  }

  // 일반 테이블: header + body 행을 ` | ` 로 잇는다. marked 가 만든 markdown table /
  // GitBook raw <table> 둘 다 같은 구조로 처리됨.
  const rows: string[] = [];
  const headerCells = $tbl
    .find('thead tr th')
    .map((_, th) => $(th).text().replace(/\s+/g, ' ').trim())
    .get();
  if (headerCells.length > 0) rows.push(headerCells.join(' | '));

  $tbl.find('tbody tr').each((_, tr) => {
    const bodyCells = $(tr)
      .find('td')
      .map((__, td) => $(td).text().replace(/\s+/g, ' ').trim())
      .get();
    if (bodyCells.some((c) => c)) rows.push(bodyCells.join(' | '));
  });

  // thead/tbody 없이 tr 만 있는 케이스 (드물지만 안전망).
  if (rows.length === 0) {
    $tbl.find('tr').each((_, tr) => {
      const cells = $(tr)
        .find('th, td')
        .map((__, c) => $(c).text().replace(/\s+/g, ' ').trim())
        .get();
      if (cells.some((c) => c)) rows.push(cells.join(' | '));
    });
  }

  return rows.join('\n');
}

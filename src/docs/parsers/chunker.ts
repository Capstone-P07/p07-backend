export interface ParsedSection {
  h1: string | null;
  h2: string | null;
  heading: string | null;
  content: string;
}

export interface TextChunk {
  heading: string | null;
  content: string;
  chunkIndex: number;
}

export interface ChunkOptions {
  maxChars?: number;
  overlap?: number;
  minChars?: number;
}

const DEFAULTS = { maxChars: 800, overlap: 80, minChars: 30 } as const;

export function chunkSections(sections: ParsedSection[], opts: ChunkOptions = {}): TextChunk[] {
  const maxChars = opts.maxChars ?? DEFAULTS.maxChars;
  const overlap = opts.overlap ?? DEFAULTS.overlap;
  const minChars = opts.minChars ?? DEFAULTS.minChars;

  const chunks: TextChunk[] = [];
  let index = 0;

  for (const section of sections) {
    const content = section.content.trim();
    if (content.length < minChars) continue;

    if (content.length <= maxChars) {
      chunks.push({ heading: section.heading, content, chunkIndex: index++ });
      continue;
    }

    for (const piece of splitLongContent(content, maxChars, overlap)) {
      chunks.push({ heading: section.heading, content: piece, chunkIndex: index++ });
    }
  }

  // Heading-only fallback: 본문이 모두 minChars 미만이거나 비어있는 페이지(예: cards 만 있는
  // 인덱스 페이지) 도 검색에는 잡히도록 heading 텍스트로 청크 1개를 만든다. heading 자체가
  // 없으면 색인할 게 없으니 빈 배열 반환.
  if (chunks.length === 0) {
    const headings = sections
      .map((s) => s.heading)
      .filter((h): h is string => !!h && h.trim().length > 0);
    if (headings.length > 0) {
      chunks.push({
        heading: headings[0],
        content: headings.join('\n'),
        chunkIndex: 0,
      });
    }
  }

  return chunks;
}

function splitLongContent(content: string, maxChars: number, overlap: number): string[] {
  const pieces: string[] = [];
  let start = 0;

  while (start < content.length) {
    const idealEnd = Math.min(start + maxChars, content.length);

    let end: number;
    if (idealEnd >= content.length) {
      end = content.length;
    } else if (isInsideCodeFence(content, idealEnd)) {
      end = expandPastCodeFence(content, idealEnd);
    } else {
      end = findBoundary(content, start, idealEnd);
    }

    pieces.push(content.slice(start, end).trim());

    if (end >= content.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return pieces.filter((p) => p.length > 0);
}

function findBoundary(content: string, start: number, idealEnd: number): number {
  const searchFloor = Math.max(idealEnd - 200, start + 1);
  const window = content.slice(searchFloor, idealEnd);

  const paragraphIdx = window.lastIndexOf('\n\n');
  if (paragraphIdx >= 0) return searchFloor + paragraphIdx + 2;

  const sentenceIdx = lastSentenceEnd(window);
  if (sentenceIdx >= 0) return searchFloor + sentenceIdx + 1;

  const wordIdx = Math.max(window.lastIndexOf(' '), window.lastIndexOf('\n'), window.lastIndexOf('\t'));
  if (wordIdx >= 0) return searchFloor + wordIdx + 1;

  return idealEnd;
}

function lastSentenceEnd(s: string): number {
  const re = /(다|요|습니다|니다)\.|[?!]/g;
  let last = -1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    last = m.index + m[0].length - 1;
  }
  return last;
}

function isInsideCodeFence(content: string, position: number): boolean {
  const fenceRe = /```/g;
  let count = 0;
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(content)) !== null) {
    if (m.index >= position) break;
    count++;
  }
  return count % 2 === 1;
}

function expandPastCodeFence(content: string, position: number): number {
  const closing = content.indexOf('```', position);
  if (closing < 0) return content.length;
  return closing + 3;
}

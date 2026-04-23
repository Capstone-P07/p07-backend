export interface ParsedSection {
  heading: string | null;
  content: string;
}

export interface TextChunk {
  heading: string | null;
  content: string;
  chunkIndex: number;
}

const MAX_CHUNK_SIZE = 800;
const OVERLAP_SIZE = 100;

export function chunkSections(sections: ParsedSection[]): TextChunk[] {
  const chunks: TextChunk[] = [];
  let index = 0;

  for (const section of sections) {
    const content = section.content.trim();
    if (!content) continue;

    if (content.length <= MAX_CHUNK_SIZE) {
      chunks.push({ heading: section.heading, content, chunkIndex: index++ });
    } else {
      // 청크가 너무 크면 overlap을 두고 분할
      let start = 0;
      while (start < content.length) {
        const end = Math.min(start + MAX_CHUNK_SIZE, content.length);
        chunks.push({
          heading: section.heading,
          content: content.slice(start, end),
          chunkIndex: index++,
        });
        if (end === content.length) break;
        start = end - OVERLAP_SIZE;
      }
    }
  }

  return chunks;
}

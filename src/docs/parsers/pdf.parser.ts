// pdf-parse는 CJS 모듈이라 require로 가져옵니다.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>;
import type { ParsedSection } from './chunker';

export async function parsePdf(buffer: Buffer): Promise<{ title: string; sections: ParsedSection[] }> {
  const data = await pdfParse(buffer);
  const rawText = data.text;

  // 빈 줄 기준으로 단락 분리
  const paragraphs = rawText
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter((p) => p.length > 10);

  const sections: ParsedSection[] = [];
  let currentHeading: string | null = null;
  let currentContent: string[] = [];

  for (const para of paragraphs) {
    // 짧고 마침표로 끝나지 않으면 제목으로 간주
    const isHeading = para.length < 80 && !para.endsWith('.');

    if (isHeading) {
      if (currentContent.length > 0) {
        sections.push({ heading: currentHeading, content: currentContent.join('\n\n') });
        currentContent = [];
      }
      currentHeading = para;
    } else {
      currentContent.push(para);
    }
  }

  if (currentContent.length > 0) {
    sections.push({ heading: currentHeading, content: currentContent.join('\n\n') });
  }

  if (sections.length === 0) {
    sections.push({ heading: null, content: rawText.trim() });
  }

  const title = sections[0]?.heading || 'Untitled Document';
  return { title, sections };
}

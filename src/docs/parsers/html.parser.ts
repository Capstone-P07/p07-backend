import { htmlToSections, type ParsedDocument } from './html-to-sections';

// HTML 진입점 (URL ingest 등). markdown 진입과 동일한 cheerio 코어로 수렴.
// 유형 호환을 위해 ParsedDocument 도 여기서 re-export.
export type { ParsedDocument };

export function parseHtml(raw: string): ParsedDocument {
  return htmlToSections(raw);
}

// URL fetch 는 별도 티켓 (21-46) — SSRF 화이트리스트, content-type 검증, timeout
// 정책이 합쳐져야 한다. 코어 파싱(htmlToSections) 자체는 이미 통과.
export function parseUrl(_url: string): Promise<ParsedDocument> {
  return Promise.reject(
    new Error('parseUrl 은 아직 구현되지 않았습니다. (Story 21-46) URL fetch 정책 도입 후 활성화 예정.'),
  );
}

import { chunkSections, ParsedSection } from './chunker';

const section = (content: string, heading: string | null = 'H1 > H2'): ParsedSection => ({
  h1: 'H1',
  h2: 'H2',
  heading,
  content,
});

describe('chunkSections', () => {
  it('짧은 섹션은 1개 chunk로, chunkIndex=0, heading 보존', () => {
    const chunks = chunkSections([section('짧은 본문')], { minChars: 1 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].heading).toBe('H1 > H2');
    expect(chunks[0].content).toContain('짧은 본문');
  });

  it('minChars 미만이면 drop (기본 minChars=50)', () => {
    const chunks = chunkSections([section('x'.repeat(10))]);
    expect(chunks).toHaveLength(0);
  });

  it('maxChars 초과 시 문단 경계에서 분할', () => {
    const p1 = '가'.repeat(300);
    const p2 = '나'.repeat(300);
    const content = `${p1}\n\n${p2}`;
    const chunks = chunkSections([section(content)], { maxChars: 400 });
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    // 첫 chunk는 문단 경계에서 끝나야 함 — 가로만 구성
    expect(chunks[0].content.endsWith('가')).toBe(true);
  });

  it('문장 종결 경계 존중 (다. 뒤에서 분할)', () => {
    const a = '안녕하세요. '.repeat(40); // ~520자
    const b = '반갑습니다. '.repeat(40); // ~520자
    const content = `${a}${b}`;
    const chunks = chunkSections([section(content)], { maxChars: 500, overlap: 0 });
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    // 문장 종결 '.'에서 끊겨야
    expect(chunks[0].content).toMatch(/\.$|\.\s*$/);
  });

  it('fenced code block 안쪽에서 분할되지 않음', () => {
    const pre = '서문 '.repeat(60); // ~180자
    const code = '```\n' + 'x'.repeat(500) + '\n```';
    const post = ' 후문 '.repeat(60);
    const content = `${pre}\n\n${code}\n\n${post}`;
    const chunks = chunkSections([section(content)], { maxChars: 400, overlap: 0 });
    // 코드 블록이 한 chunk 안에 온전히 들어간 chunk가 있어야
    const hasFullCodeBlock = chunks.some((c) => c.content.includes('```') && c.content.includes('xxxxx'));
    expect(hasFullCodeBlock).toBe(true);
  });

  it('빈 sections 입력 → 빈 chunks', () => {
    expect(chunkSections([])).toEqual([]);
  });

  it('분할 없을 때 overlap 미적용', () => {
    const body = '짧은 본문. '.repeat(10); // ~70자
    const chunks = chunkSections([section(body)], { maxChars: 800, overlap: 80 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content.trim()).toBe(body.trim());
  });

  it('chunkIndex는 여러 섹션에 걸쳐 모노토닉', () => {
    const long = '가'.repeat(2000);
    const chunks = chunkSections(
      [section(long, 'A'), section(long, 'B'), section(long, 'C')],
      { maxChars: 500, overlap: 0 },
    );
    const indices = chunks.map((c) => c.chunkIndex);
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
    expect(new Set(indices).size).toBe(indices.length);
    expect(indices[0]).toBe(0);
  });
});

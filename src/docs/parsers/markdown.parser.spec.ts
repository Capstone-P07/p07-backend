import { parseMarkdown } from './markdown.parser';

// stripGitBookSyntax 의 단위 동작은 gitbook-normalize.spec.ts 에서, 섹션 분리 / table /
// figure 등 cheerio 추출은 html-to-sections.spec.ts 에서 cover 한다. 여기서는 두 단계가
// 합쳐진 parseMarkdown 진입점의 회귀만 본다 (이전 버전의 동작 보존).

describe('parseMarkdown', () => {
  it('# 제목 → 문서 title, ## 섹션 → 섹션 분리', () => {
    const raw = '# 멤버\n\n## 개요\n\n본문입니다.';
    const { title, sections } = parseMarkdown(raw);
    expect(title).toBe('멤버');
    expect(sections).toHaveLength(1);
    expect(sections[0].h1).toBe('멤버');
    expect(sections[0].h2).toBe('개요');
    expect(sections[0].heading).toBe('멤버 > 개요');
    expect(sections[0].content).toContain('본문입니다.');
  });

  it('같은 h1 아래 여러 h2는 각자의 section', () => {
    const raw = '# 제목\n\n## A\n\nA본문\n\n## B\n\nB본문';
    const { sections } = parseMarkdown(raw);
    expect(sections).toHaveLength(2);
    expect(sections[0].heading).toBe('제목 > A');
    expect(sections[1].heading).toBe('제목 > B');
  });

  it('h1 없는 문서 → title="Untitled", h2 섹션은 유지', () => {
    const raw = '## 섹션만 있음\n\n본문';
    const { title, sections } = parseMarkdown(raw);
    expect(title).toBe('Untitled');
    expect(sections).toHaveLength(1);
    expect(sections[0].heading).toBe('섹션만 있음');
  });

  it('h4는 별도 섹션으로 분리 (#### 관리자, #### 멤버 구조)', () => {
    const raw =
      '# 멤버\n\n## 권한\n\n워크스페이스의 모든 사용자는 권한을 가집니다.\n\n#### 관리자\n\n관리자 설명.\n\n#### 멤버\n\n멤버 설명.';
    const { sections } = parseMarkdown(raw);
    expect(sections.length).toBeGreaterThanOrEqual(3);
    const headings = sections.map((s) => s.heading);
    expect(headings).toContain('멤버 > 권한 > 관리자');
    expect(headings).toContain('멤버 > 권한 > 멤버');
  });

  it('h3은 섹션 경계가 아니라 content에 inline 포함', () => {
    const raw = '# T\n\n## S\n\n전문\n\n### 소제목\n\n소제목 본문';
    const { sections } = parseMarkdown(raw);
    expect(sections).toHaveLength(1);
    expect(sections[0].content).toContain('### 소제목');
    expect(sections[0].content).toContain('소제목 본문');
  });

  it('figure/hint가 포함된 실제 corpus 스타일 입력 처리', () => {
    const raw =
      '# 멤버\n\n<figure><img src="x.png" alt=""><figcaption></figcaption></figure>\n\n## 권한\n\n{% hint style="danger" %}무료 요금제에서는 모두 관리자입니다.{% endhint %}\n\n설명.';
    const { title, sections } = parseMarkdown(raw);
    expect(title).toBe('멤버');
    expect(sections).toHaveLength(1);
    expect(sections[0].content).toContain('무료 요금제에서는 모두 관리자입니다.');
    expect(sections[0].content).not.toContain('<figure>');
  });
});

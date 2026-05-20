import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { marked } from 'marked';
import { htmlToSections } from './html-to-sections';
import { normalizeGitBook } from './gitbook-normalize';

const FIXTURES = join(__dirname, '..', '..', '..', 'test', 'fixtures', 'riido');

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES, name), 'utf-8');
}

// 마크다운 → HTML → ParsedDocument 의 통합 경로를 spec 에서도 동일하게 거친다.
function parseMarkdownFixture(name: string) {
  const md = loadFixture(name);
  const html = marked.parse(normalizeGitBook(md), { async: false }) as string;
  return htmlToSections(html);
}

describe('htmlToSections (cheerio walker)', () => {
  describe('direct HTML input', () => {
    it('handles a simple h1 + p pair', () => {
      const out = htmlToSections('<h1>제목</h1><p>본문 단락입니다.</p>');
      expect(out.title).toBe('제목');
      expect(out.sections).toHaveLength(1);
      expect(out.sections[0].h1).toBe('제목');
      expect(out.sections[0].content).toContain('본문 단락');
    });

    it('splits sections on h2', () => {
      const out = htmlToSections(
        '<h1>T</h1><h2>A</h2><p>본문 A</p><h2>B</h2><p>본문 B</p>',
      );
      expect(out.sections).toHaveLength(2);
      expect(out.sections[0].heading).toBe('T > A');
      expect(out.sections[1].heading).toBe('T > B');
    });

    it('falls back to "Untitled" when no h1 present', () => {
      const out = htmlToSections('<p>제목 없는 본문</p>');
      expect(out.title).toBe('Untitled');
    });

    it('extracts cards-table rows as markdown list', () => {
      const html = `
        <table data-view="cards">
          <tbody>
            <tr><td>설명1</td><td>라벨1</td></tr>
            <tr><td>설명2</td><td>라벨2</td></tr>
          </tbody>
        </table>
      `;
      // table 만 있는 경우 sections 가 안 만들어지므로 헤딩 추가.
      const out = htmlToSections(`<h1>T</h1>${html}`);
      const content = out.sections[0]?.content ?? '';
      expect(content).toContain('- 설명1 (라벨1)');
      expect(content).toContain('- 설명2 (라벨2)');
    });

    it('extracts generic table rows joined with " | "', () => {
      const html = `
        <h1>T</h1>
        <table>
          <thead><tr><th>이름</th><th>값</th></tr></thead>
          <tbody>
            <tr><td>Free</td><td>2</td></tr>
            <tr><td>Pro</td><td>3</td></tr>
          </tbody>
        </table>
      `;
      const out = htmlToSections(html);
      const content = out.sections[0].content;
      expect(content).toContain('이름 | 값');
      expect(content).toContain('Free | 2');
      expect(content).toContain('Pro | 3');
    });

    it('preserves code blocks with fence', () => {
      const out = htmlToSections('<h1>T</h1><pre><code>{"a": 1}</code></pre>');
      expect(out.sections[0].content).toContain('```');
      expect(out.sections[0].content).toContain('{"a": 1}');
    });

    it('keeps figure caption + alt text but drops the image', () => {
      const html =
        '<h1>T</h1><figure><img alt="대시보드 화면"/><figcaption>대시보드 캡션</figcaption></figure>';
      const out = htmlToSections(html);
      expect(out.sections[0].content).toContain('대시보드 캡션');
      expect(out.sections[0].content).toContain('대시보드 화면');
    });

    it('walks into nested div/section wrappers', () => {
      const out = htmlToSections(
        '<h1>T</h1><div><div><p>깊이 묻힌 본문</p></div></div>',
      );
      expect(out.sections[0].content).toContain('깊이 묻힌 본문');
    });
  });

  describe('riido fixtures (markdown → normalize → marked → htmlToSections)', () => {
    it('01_소개: cards-table rows survive (previously dropped to 0 chunks)', () => {
      const out = parseMarkdownFixture('01_소개.md');
      expect(out.title).toBe('소개');
      expect(out.sections.length).toBeGreaterThan(0);
      const all = out.sections.map((s) => s.content).join('\n');
      // 6개 카드 중 적어도 두 개의 설명 텍스트는 살아있어야 한다.
      expect(all).toContain('대기 작업부터 백로그');
      expect(all).toContain('팀의 리소스를 집중');
    });

    it('03_다운로드: short doc still produces a section with link text', () => {
      const out = parseMarkdownFixture('03_다운로드.md');
      expect(out.title).toBe('다운로드');
      expect(out.sections.length).toBeGreaterThan(0);
      expect(out.sections[0].content).toContain('https://www.riido.io/download');
    });

    it('06_구독-및-결제: tabs become sub-headings, body preserved', () => {
      const out = parseMarkdownFixture('06_구독-및-결제.md');
      const all = out.sections.map((s) => s.content).join('\n');
      expect(all).toContain('월별 결제');
      expect(all).toContain('연간 결제');
      expect(all).toContain('1년마다 자동 갱신');
    });

    it('07_팀: raw <table> rows survive (Free/Pro/Business labels)', () => {
      const out = parseMarkdownFixture('07_팀.md');
      const all = out.sections.map((s) => s.content).join('\n');
      expect(all).toContain('Free');
      expect(all).toContain('Pro');
      expect(all).toContain('Business');
    });

    it('12_백로그: regression — produces several sections (pinned)', () => {
      const out = parseMarkdownFixture('12_백로그.md');
      // 12_백로그 는 H1 + 여러 H2 가 있어 다수 섹션 기대. 정확한 수는 lock 안 함.
      expect(out.sections.length).toBeGreaterThanOrEqual(3);
      expect(out.title).toBe('계획: 백로그');
    });

    it('13_작업: stepper unwraps to multiple H3 sub-headings', () => {
      const out = parseMarkdownFixture('13_작업.md');
      const all = out.sections.map((s) => s.content).join('\n');
      expect(all).toContain('프로젝트 (Project)');
      expect(all).toContain('목표 (Milestone)');
      expect(all).toContain('작업 (Task)');
      expect(all).toContain('하위작업 (Subtask)');
      // GitBook stepper 마크업이 본문에 노출되지 않아야 한다.
      expect(all).not.toMatch(/\{%/);
    });

    it('27_MCP-서버: details bodies are indexed (JSON config text survives)', () => {
      const out = parseMarkdownFixture('27_MCP-서버.md');
      const all = out.sections.map((s) => s.content).join('\n');
      // <summary><strong>X</strong></summary> → ### X 로 변환됐어야 한다.
      expect(all).toContain('Claude Desktop');
      expect(all).toContain('ChatGPT');
      // details 안 코드블록의 식별자가 살아있어야 한다.
      expect(all).toContain('claude_desktop_config.json');
      expect(all).toContain('mcpServers');
      // raw HTML 마크업 노출 없음.
      expect(all).not.toContain('<details>');
      expect(all).not.toContain('<summary>');
    });
  });
});

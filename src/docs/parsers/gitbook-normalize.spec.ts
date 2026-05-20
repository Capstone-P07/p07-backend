import { normalizeGitBook } from './gitbook-normalize';

describe('normalizeGitBook', () => {
  it('returns raw markdown unchanged when no GitBook tokens present', () => {
    const md = '# 제목\n\n본문 한 줄.\n';
    expect(normalizeGitBook(md)).toBe(md);
  });

  it('unwraps {% hint %} blocks, keeping inner text', () => {
    const md = '앞\n\n{% hint style="info" %}\n안내 메시지\n{% endhint %}\n\n뒤';
    const out = normalizeGitBook(md);
    expect(out).toContain('안내 메시지');
    expect(out).not.toMatch(/\{%/);
  });

  it('converts {% tab title="X" %} to a markdown sub-heading', () => {
    const md = [
      '{% tabs %}',
      '{% tab title="월별 결제" %}',
      '월별 본문',
      '{% endtab %}',
      '{% tab title="연간 결제" %}',
      '연간 본문',
      '{% endtab %}',
      '{% endtabs %}',
    ].join('\n');
    const out = normalizeGitBook(md);
    expect(out).toContain('#### 월별 결제');
    expect(out).toContain('#### 연간 결제');
    expect(out).toContain('월별 본문');
    expect(out).toContain('연간 본문');
    expect(out).not.toMatch(/\{%/);
  });

  it('removes {% stepper %} / {% step %} tags but preserves the markdown inside', () => {
    const md = [
      '{% stepper %}',
      '{% step %}',
      '### 프로젝트 (Project)',
      '본문 1',
      '{% endstep %}',
      '{% step %}',
      '### 목표 (Milestone)',
      '본문 2',
      '{% endstep %}',
      '{% endstepper %}',
    ].join('\n');
    const out = normalizeGitBook(md);
    expect(out).toContain('### 프로젝트 (Project)');
    expect(out).toContain('### 목표 (Milestone)');
    expect(out).toContain('본문 1');
    expect(out).toContain('본문 2');
    expect(out).not.toMatch(/\{%/);
  });

  it('rewrites {% embed url %} as a markdown link', () => {
    const md = '{% embed url="<https://way.riido.io/ko>" %}';
    const out = normalizeGitBook(md);
    expect(out).toContain('https://way.riido.io/ko');
    expect(out).toContain('[https://way.riido.io/ko](https://way.riido.io/ko)');
    expect(out).not.toMatch(/\{%/);
  });

  it('promotes <summary><strong>X</strong></summary> to ### X and drops <details> wrappers', () => {
    const md = [
      '<details>',
      '',
      '<summary><strong>Claude Desktop</strong></summary>',
      '',
      '1. 설정 열기',
      '',
      '```json',
      '{"mcpServers": {}}',
      '```',
      '',
      '</details>',
    ].join('\n');
    const out = normalizeGitBook(md);
    expect(out).toContain('### Claude Desktop');
    expect(out).toContain('1. 설정 열기');
    expect(out).toContain('```json');
    expect(out).toContain('{"mcpServers": {}}');
    expect(out).not.toContain('<details>');
    expect(out).not.toContain('</details>');
    expect(out).not.toContain('<summary>');
  });

  it('handles <summary> without <strong>', () => {
    const md = '<summary>요금제의 차이가 있나요?</summary>';
    expect(normalizeGitBook(md)).toContain('### 요금제의 차이가 있나요?');
  });

  it('strips <picture> blocks entirely', () => {
    const md = '앞\n<picture><img src="x"/></picture>\n뒤';
    const out = normalizeGitBook(md);
    expect(out).toContain('앞');
    expect(out).toContain('뒤');
    expect(out).not.toContain('<picture>');
    expect(out).not.toContain('<img');
  });

  it('handles GitBook backslash-escaped brackets', () => {
    const md = '\\[프로젝트] 단계';
    expect(normalizeGitBook(md)).toBe('[프로젝트] 단계');
  });

  it('handles nested {% hint %} inside <details>', () => {
    const md = [
      '<details>',
      '<summary><strong>ChatGPT</strong></summary>',
      '{% hint style="info" %}',
      'Pro 요금제 이상 필요',
      '{% endhint %}',
      '본문',
      '</details>',
    ].join('\n');
    const out = normalizeGitBook(md);
    expect(out).toContain('### ChatGPT');
    expect(out).toContain('Pro 요금제 이상 필요');
    expect(out).toContain('본문');
    expect(out).not.toMatch(/\{%/);
    expect(out).not.toContain('<details>');
  });
});

// GitBook의 마크다운 확장 + 일부 raw HTML 블록을 plain markdown 으로 정규화.
//
// 이 단계는 marked.parse() 호출 *전에* 수행된다. 이유:
//  1. {% stepper %} / {% step %} 같은 GitBook tag 가 marked 에 그대로 들어가면
//     본문에 마크업 문자열이 그대로 노출된다 (FTS 노이즈).
//  2. <details>/<summary> 가 raw HTML 블록으로 marked 에 들어가면
//     안의 markdown(코드블록, 헤딩 등) 이 lexer 에 의해 'html' 토큰으로
//     통째 잡혀 손실된다. 미리 풀어주면 안의 markdown 이 정상 토큰화된다.
//
// 코드블록(fenced ```) 안의 GitBook 문법은 손실 위험이 있지만,
// 가이드 코퍼스에서 실제로 나타나지 않으므로 알려진 한계로 둔다.

interface Replacement {
  pattern: RegExp;
  replace: string | ((...args: string[]) => string);
}

const REPLACEMENTS: Replacement[] = [
  // {% hint style="..." %} ... {% endhint %} → 안의 텍스트만
  { pattern: /\{%\s*hint[^%]*%\}([\s\S]*?)\{%\s*endhint\s*%\}/g, replace: '$1' },

  // {% tabs %}{% tab title="X" %} ... {% endtab %} ... {% endtabs %}
  // tab 별로 #### X 헤딩으로 변환, tabs 자체는 제거.
  { pattern: /\{%\s*tabs?\s*%\}/g, replace: '' },
  { pattern: /\{%\s*endtabs?\s*%\}/g, replace: '' },
  { pattern: /\{%\s*tab\s+title="([^"]*)"\s*%\}/g, replace: '\n#### $1\n' },
  { pattern: /\{%\s*endtab\s*%\}/g, replace: '' },

  // {% stepper %}{% step %} ... {% endstep %} ... {% endstepper %}
  // 각 step 의 markdown 을 그대로 보존하고 stepper/step tag 만 제거.
  { pattern: /\{%\s*stepper\s*%\}/g, replace: '' },
  { pattern: /\{%\s*endstepper\s*%\}/g, replace: '' },
  { pattern: /\{%\s*step\s*%\}/g, replace: '' },
  { pattern: /\{%\s*endstep\s*%\}/g, replace: '' },

  // {% embed url="X" %} → 일반 링크. URL 안에 < > 가 있는 GitBook 표기도 처리.
  {
    pattern: /\{%\s*embed\s+url="<?([^">]*)>?"\s*%\}/g,
    replace: (_m, url: string) => `\n[${url}](${url})\n`,
  },

  // <details>/</details> → 빈 줄. 안의 markdown 은 보존.
  { pattern: /<details>\s*/g, replace: '\n' },
  { pattern: /<\/details>\s*/g, replace: '\n' },

  // <summary><strong>X</strong></summary> 또는 <summary>X</summary> → ### X
  // 가이드에서 summary 는 항상 details 의 제목 역할이라 sub-heading 으로 승격.
  {
    pattern: /<summary>\s*(?:<strong>)?([\s\S]*?)(?:<\/strong>)?\s*<\/summary>/g,
    replace: (_m, inner: string) => `\n### ${inner.replace(/<[^>]+>/g, '').trim()}\n`,
  },

  // <picture>...</picture> → 빈 줄 (가이드에서 alt 거의 없어 보존 가치 낮음)
  { pattern: /<picture>[\s\S]*?<\/picture>/g, replace: '\n' },

  // GitBook 의 \[ \] escape (markdown link 와 충돌 방지용으로 source 에 들어있음)
  { pattern: /\\\[/g, replace: '[' },
  { pattern: /\\]/g, replace: ']' },
];

export function normalizeGitBook(raw: string): string {
  return REPLACEMENTS.reduce<string>((acc, { pattern, replace }) => {
    if (typeof replace === 'string') {
      return acc.replace(pattern, replace);
    }
    return acc.replace(pattern, replace as (substring: string, ...args: unknown[]) => string);
  }, raw);
}

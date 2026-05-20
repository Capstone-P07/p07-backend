import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import OpenAI from 'openai';

type AnswerType = 'success' | 'out_of_scope' | 'no_document';

@Injectable()
export class LlmService {
  private openai?: OpenAI;

  async normalizeQuestion(question: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        stream: false,
        messages: [
          {
            role: 'system',
            content: `당신은 검색 쿼리 최적화 전문가입니다.
사용자의 질문을 핵심 키워드 중심의 간결한 검색 쿼리로 변환하세요.

규칙:
- 불필요한 조사, 어미, 인사말 제거
- 핵심 명사/동사 위주로 2~5개 단어로 압축
- 한국어로 변환하되 영어 고유명사(제품명, 기술명 등)는 그대로 유지
- 오직 변환된 쿼리만 출력 (설명 없이)

예시:
- "멤버를 초대하려면 어떻게 해야 하나요?" → "멤버 초대 방법"
- "스프린트 시작하는 법 알려줘" → "스프린트 시작"
- "깃허브 연동은 어떻게 하나요?" → "깃허브 연동"
- "llm이 뭐야?" → "llm 설명"`,
          },
          {
            role: 'user',
            content: question,
          },
        ],
      });
      return response.choices[0]?.message?.content?.trim() ?? question;
    } catch {
      return question;
    }
  }

  async streamAnswer(
    question: string,
    chunks: any[],
    previousMessages: { role: 'user' | 'assistant'; content: string }[],
    onChunk: (text: string) => void,
    onDone: (type: AnswerType) => void | Promise<void>,
  ) {
    const openai = this.getClient();
    const context = chunks
      .map((c, i) =>
        [
          `[${i + 1}] 문서: ${c.docTitle ?? c.title ?? '제목 없음'}`,
          `섹션: ${c.heading ?? '섹션 없음'}`,
          c.content,
        ].join('\n'),
      )
      .join('\n\n');

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      stream: true,
      messages: [
        {
          role: 'system',
          content: `당신은 Riido(뤼이도) 서비스 안내 챗봇입니다.

규칙:
- 반드시 아래 제공된 문서 근거만 바탕으로 답변하세요.
- "Riido", "뤼이도", "리이도"는 같은 서비스 이름으로 간주하세요.
- 문서 근거가 있고 질문이 Riido/뤼이도 서비스 소개, 기능, 사용법, 설정, 문제 해결과 관련 있으면 [SUCCESS]로 시작하세요.
- Riido/뤼이도와 무관한 질문이면 [OUT_OF_SCOPE]로 시작하세요.
- 질문은 Riido/뤼이도와 관련 있지만 문서 근거가 비어 있거나 근거에서 답을 찾을 수 없으면 [NO_DOCUMENT]로 시작하세요.
- 일반 지식이나 추측으로 답하지 마세요.
- 항상 한국어로 답변하세요.
- 반드시 아래 응답 형식을 그대로 따르세요.

응답 형식:
- 범위 외 질문: [OUT_OF_SCOPE]\n죄송합니다. 저는 Riido 서비스 안내만 도와드릴 수 있어요. Riido 관련 질문을 해주세요.
- 문서에 없는 질문: [NO_DOCUMENT]\n해당 내용은 현재 문서에서 찾을 수 없어요. 고객센터에 문의해 주세요.
- 정상 답변: 반드시 아래 구조를 지키세요.

[SUCCESS]
**요약**

(핵심 내용을 1~2문장으로 요약)

**단계별 안내**
1. 첫 번째 단계
2. 두 번째 단계

주의사항:
- [SUCCESS] 태그는 반드시 첫 줄에 단독으로만 작성하고 이후 절대 반복하지 마세요.
- 각 헤더(**요약**, **단계별 안내**) 앞뒤로 반드시 빈 줄을 넣으세요.
- "뤼이도란 무엇인가", "기능 설명" 등 단계가 필요 없는 질문은 **단계별 안내** 섹션 전체를 생략하세요.
- 단계별 안내를 생략할 때 헤더도 절대 포함하지 마세요.

[문서 근거]
${context || '(관련 문서 없음)'}`,
        },
        ...previousMessages,
        {
          role: 'user',
          content: question,
        },
      ],
    });

    let fullText = '';
    let headerStripped = false;
    let type: AnswerType = 'success';

    for await (const part of stream) {
      const text = part.choices[0]?.delta?.content ?? '';
      if (!text) continue;

      fullText += text;

      if (!headerStripped && fullText.length < 30) continue;

      if (!headerStripped) {
        if (fullText.startsWith('[OUT_OF_SCOPE]')) {
          type = 'out_of_scope';
        } else if (fullText.startsWith('[NO_DOCUMENT]')) {
          type = 'no_document';
        } else {
          type = 'success';
        }

        const cleaned = fullText
          .replace('[OUT_OF_SCOPE]\n', '')
          .replace('[NO_DOCUMENT]\n', '')
          .replace('[SUCCESS]\n', '');
        headerStripped = true;
        if (cleaned) onChunk(cleaned);
        continue;
      }

      onChunk(text);
    }

    await onDone(type);
  }

  private getClient() {
    if (this.openai) {
      return this.openai;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException('OPENAI_API_KEY가 설정되어 있지 않습니다.');
    }

    this.openai = new OpenAI({ apiKey });
    return this.openai;
  }
}

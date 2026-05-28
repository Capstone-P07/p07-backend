import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import OpenAI from 'openai';

type AnswerType = 'success' | 'out_of_scope' | 'no_document';

@Injectable()
export class LlmService {
  private openai?: OpenAI;

  async normalizeQuestion(question: string): Promise<string> {
    try {
      const openai = this.getClient();
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        stream: false,
        messages: [
          {
            role: 'system',
            content: `당신은 PostgreSQL 한국어 FTS 검색 쿼리 정규화 전문가입니다.
사용자의 질문을 Riido 가이드 문서 검색에 적합한 핵심 키워드로 변환하세요.

규칙:
- 출력은 설명 없는 한 줄 키워드만 작성하세요.
- 불필요한 조사, 어미, 인사말은 제거하세요.
- 복합 질문은 핵심 항목을 모두 보존하세요.
- 핵심 명사/동사 위주로 간결하게 압축하세요.
- 과한 추측 키워드나 문서에 없을 법한 확장어는 추가하지 마세요.
- 한국어 중심으로 작성하되 영어 고유명사와 기술명은 유지하세요.
- 선별 동의어만 확장하세요.
  - 팀원 → 팀원 멤버
  - 깃헙/깃허브 → GitHub 깃허브
  - OS → 운영체제 OS
  - 다운로드 → 다운로드 설치
  - 요금/가격 → 구독 결제 요금

예시:
- "멤버를 초대하려면 어떻게 해야 하나요?" → "멤버 초대 방법"
- "스프린트 시작하는 법 알려줘" → "스프린트 시작"
- "깃허브 연동은 어떻게 하나요?" → "GitHub 깃허브 연동"
- "다운로드 방법이랑 지원 OS를 같이 알려줘" → "다운로드 설치 지원 OS 운영체제"
- "팀원 권한 뭐뭐 있어?" → "팀원 멤버 권한"
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
      temperature: 0.0, //창의적 생성 억제
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
        if (fullText.includes('[OUT_OF_SCOPE]')) {
          type = 'out_of_scope';
        } else if (fullText.includes('[NO_DOCUMENT]')) {
          type = 'no_document';
        } else {
          type = 'success';
        }

        const cleaned = fullText
          .replace(/\[OUT_OF_SCOPE\]\n{0,2}/g, '')
          .replace(/\[NO_DOCUMENT\]\n{0,2}/g, '')
          .replace(/\[SUCCESS\]\n{0,2}/g, '');

        headerStripped = true;
        if (cleaned.trim()) onChunk(cleaned);
        continue;
      }

      const safeText = text
        .replace(/\[SUCCESS\]/g, '')
        .replace(/\[OUT_OF_SCOPE\]/g, '')
        .replace(/\[NO_DOCUMENT\]/g, '');

      if(safeText) onChunk(safeText);
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

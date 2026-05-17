import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import OpenAI from 'openai';

type AnswerType = 'success' | 'out_of_scope' | 'no_document';

@Injectable()
export class LlmService {
  private openai?: OpenAI;

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

응답 형식:
- 범위 외 질문: [OUT_OF_SCOPE]\n죄송합니다. 저는 Riido 서비스 안내만 도와드릴 수 있어요. Riido 관련 질문을 해주세요.
- 문서에 없는 질문: [NO_DOCUMENT]\n해당 내용은 현재 문서에서 찾을 수 없어요. 고객센터에 문의해 주세요.
- 정상 답변: [SUCCESS]\n
요약
(핵심 내용을 1~2문장으로 요약)

단계별 안내
1. 첫 번째 단계
2. 두 번째 단계
(단계가 필요 없는 경우 생략)

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

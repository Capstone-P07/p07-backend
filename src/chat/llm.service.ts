import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class LlmService {
  private openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  async streamAnswer(
    question: string,
    chunks: any[],
    previousMessages: { role: 'user' | 'assistant'; content: string }[],
    onChunk: (text: string) => void,
    onDone: (type: 'success' | 'out_of_scope' | 'no_document') => void,
  ) {
    const context = chunks
      .map((c, i) => `[${i + 1}] ${c.heading ?? ''}\n${c.content}`)
      .join('\n\n');

    const stream = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      stream: true,
      messages: [
        {
          role: 'system',
          content: `당신은 Riido 협업 서비스의 사용 안내 챗봇입니다.

규칙:
- 반드시 아래 제공된 문서 근거만을 바탕으로 답변하세요.
- 문서 근거에 없는 내용은 절대 답변하지 마세요.
- 절대 자체 지식을 사용하지 마세요. 오직 문서 근거만 사용하세요.
- Riido와 무관한 질문(out_of_scope)이면 반드시 [OUT_OF_SCOPE]로 시작하세요.
- 문서 근거가 비어있거나 질문과 관련이 없으면 반드시 [NO_DOCUMENT]로 시작하세요.
- 항상 한국어로 답변하세요.

응답 형식:
- Riido 무관 질문: [OUT_OF_SCOPE]\n죄송합니다. 저는 Riido 서비스 안내만 도와드릴 수 있어요. Riido 관련 질문을 해주세요 😊
- 문서에 없는 질문: [NO_DOCUMENT]\n해당 내용은 현재 문서에서 찾을 수 없어요. 고객센터에 문의해 주세요.
- 정상 답변: [SUCCESS]\n

📌 요약
(핵심 내용을 1~2문장으로 요약)

📋 단계별 안내
1. 첫 번째 단계
2. 두 번째 단계
(단계가 필요없는 경우 생략)

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
    let type: 'success' | 'out_of_scope' | 'no_document' = 'success';

    for await (const part of stream) {
      const text = part.choices[0]?.delta?.content ?? '';
      if (!text) continue;

      fullText += text;

      // 태그 감지 (앞부분에서만)
      if (!headerStripped && fullText.length < 30) continue;

      if (!headerStripped) {
        if (fullText.startsWith('[OUT_OF_SCOPE]')) {
          type = 'out_of_scope';
        } else if (fullText.startsWith('[NO_DOCUMENT]')) {
          type = 'no_document';
        } else {
          type = 'success';
        }
        // 태그 제거하고 나머지 텍스트 전송
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

    onDone(type);
  }
}
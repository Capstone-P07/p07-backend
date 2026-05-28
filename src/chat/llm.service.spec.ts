import { ServiceUnavailableException } from '@nestjs/common';
import { LlmService } from './llm.service';

const mockCreate = jest.fn();

jest.mock('openai', () =>
  jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  })),
);

async function* answerStream(parts: string[]) {
  for (const part of parts) {
    yield {
      choices: [
        {
          delta: {
            content: part,
          },
        },
      ],
    };
  }
}

describe('LlmService', () => {
  const originalApiKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    mockCreate.mockReset();
    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
  });

  it('does not require OPENAI_API_KEY during service construction', () => {
    delete process.env.OPENAI_API_KEY;

    expect(() => new LlmService()).not.toThrow();
  });

  it('throws a controlled error only when a chat stream is requested without OPENAI_API_KEY', async () => {
    delete process.env.OPENAI_API_KEY;
    const service = new LlmService();

    await expect(
      service.streamAnswer('질문', [], [], jest.fn(), jest.fn()),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('normalizes questions through the lazily initialized OpenAI client', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: '다운로드 설치 지원 OS 운영체제' } }],
    });
    const service = new LlmService();

    await expect(
      service.normalizeQuestion('다운로드 방법이랑 지원 OS를 같이 알려줘'),
    ).resolves.toBe('다운로드 설치 지원 OS 운영체제');

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o-mini',
        stream: false,
      }),
    );
  });

  it('falls back to the original question when normalization fails', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    mockCreate.mockRejectedValueOnce(new Error('normalization failed'));
    const service = new LlmService();

    await expect(service.normalizeQuestion('팀원 권한 뭐뭐 있어?')).resolves.toBe(
      '팀원 권한 뭐뭐 있어?',
    );

    expect(mockCreate).toHaveBeenCalled();
  });

  it('keeps the normalization prompt focused on FTS keywords and curated synonyms', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: '다운로드 설치 지원 OS 운영체제' } }],
    });
    const service = new LlmService();

    await service.normalizeQuestion('다운로드 방법이랑 지원 OS를 같이 알려줘');

    const systemPrompt = mockCreate.mock.calls[0][0].messages[0].content;
    expect(systemPrompt).toContain('설명 없는 한 줄 키워드');
    expect(systemPrompt).toContain('복합 질문');
    expect(systemPrompt).toContain('다운로드 설치');
    expect(systemPrompt).toContain('OS 운영체제');
    expect(systemPrompt).toContain('팀원');
    expect(systemPrompt).toContain('멤버');
    expect(systemPrompt).toContain('추측 키워드');
  });

  it('keeps the answer prompt on the strict no-document policy', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    mockCreate.mockResolvedValueOnce(
      answerStream([
        '[SUCCESS]\n**요약**\n다운로드 URL은 문서에서 확인됩니다. 지원 OS는 문서에서 확인되지 않습니다.',
      ]),
    );
    const service = new LlmService();

    await service.streamAnswer(
      '다운로드 방법이랑 지원 OS를 같이 알려줘',
      [
        {
          docTitle: '다운로드',
          heading: '다운로드 방법',
          content: 'Riido 다운로드는 https://riido.io/download 에서 진행합니다.',
        },
      ],
      [],
      jest.fn(),
      jest.fn(),
    );

    const systemPrompt = mockCreate.mock.calls[0][0].messages[0].content;
    expect(systemPrompt).toContain(
      '문서 근거가 있고 질문이 Riido/뤼이도 서비스 소개, 기능, 사용법, 설정, 문제 해결과 관련 있으면 [SUCCESS]로 시작하세요.',
    );
    expect(systemPrompt).toContain(
      '질문은 Riido/뤼이도와 관련 있지만 문서 근거가 비어 있거나 근거에서 답을 찾을 수 없으면 [NO_DOCUMENT]로 시작하세요.',
    );
    expect(systemPrompt).toContain('[SUCCESS]');
    expect(systemPrompt).toContain('[NO_DOCUMENT]');
    expect(systemPrompt).not.toContain('일부 항목');
    expect(systemPrompt).not.toContain('근거 있는 항목만');
    expect(systemPrompt).not.toContain('**문서에서 확인되지 않는 내용**');
    expect(systemPrompt).not.toContain('본문에 출처 번호를 추가하지 마세요');
  });
});

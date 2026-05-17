import { ServiceUnavailableException } from '@nestjs/common';
import { LlmService } from './llm.service';

describe('LlmService', () => {
  const originalApiKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
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
});

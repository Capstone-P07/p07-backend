import { ChatService } from './chat.service';

const collectEvents = (observable: ReturnType<ChatService['sendMessage']>) =>
  new Promise<any[]>((resolve, reject) => {
    const events: any[] = [];
    observable.subscribe({
      next: (event) => events.push(event),
      error: reject,
      complete: () => resolve(events),
    });
  });

describe('ChatService', () => {
  const createService = () => {
    const searchService = {
      search: jest.fn().mockResolvedValue({
        success: true,
        data: {
          chunks: [
            {
              chunkId: 10,
              docId: 1,
              docTitle: '멤버 가이드',
              heading: '멤버 > 권한 > 관리자',
              content: '관리자 권한 설명',
              url: 'https://riido.test/members',
              score: 0.8,
            },
            {
              chunkId: 9,
              docId: 1,
              docTitle: '멤버 가이드',
              heading: '멤버 > 권한',
              content: '권한 개요',
              url: 'https://riido.test/members',
              score: 0.8,
            },
          ],
        },
      }),
    };
    const llmService = {
      normalizeQuestion: jest.fn().mockResolvedValue('관리자 권한'),
      streamAnswer: jest
        .fn()
        .mockImplementation(
          async (_question, _chunks, _previous, onText, onDone) => {
            onText('답변');
            await onDone('success');
          },
        ),
    };
    const chatLogRepo = {
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const unansweredRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
      save: jest.fn(),
    };

    const service = new ChatService(
      searchService as any,
      llmService as any,
      chatLogRepo as any,
      unansweredRepo as any,
    );

    return { chatLogRepo, llmService, searchService, service };
  };

  it('searches with contextual chunks when sending a message', async () => {
    const { llmService, searchService, service } = createService();

    await collectEvents(
      service.sendMessage('관리자 권한 알려줘', 'session-1', 'user-1'),
    );

    expect(searchService.search).toHaveBeenCalledWith(
      {
        query: '관리자 권한',
        topK: 5,
        sessionId: 'session-1',
      },
      { includeContext: true },
    );
    expect(llmService.streamAnswer).toHaveBeenCalledWith(
      '관리자 권한 알려줘',
      expect.arrayContaining([
        expect.objectContaining({ chunkId: 10 }),
        expect.objectContaining({ chunkId: 9 }),
      ]),
      [],
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('keeps references valid when contextual chunks are included', async () => {
    const { service } = createService();

    const events = await collectEvents(
      service.sendMessage('관리자 권한 알려줘', 'session-1', 'user-1'),
    );

    expect(events).toContainEqual({
      data: {
        type: 'done',
        references: [
          {
            title: '멤버 가이드',
            url: 'https://riido.test/members',
            section: '멤버 > 권한 > 관리자',
          },
          {
            title: '멤버 가이드',
            url: 'https://riido.test/members',
            section: '멤버 > 권한',
          },
        ],
      },
    });
  });
});

import { SearchService } from './search.service';

describe('SearchService', () => {
  const createService = () => {
    const dataSource = {
      query: jest.fn(),
    };
    const searchLogRepo = {
      save: jest.fn().mockResolvedValue(undefined),
    };
    const redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
    };

    const service = new SearchService(
      dataSource as any,
      searchLogRepo as any,
      redis as any,
    );

    return { dataSource, searchLogRepo, redis, service };
  };

  const primaryChunk = {
    id: 3,
    doc_id: 1,
    chunk_index: 2,
    heading: '멤버 > 권한 > 관리자',
    content: '관리자 권한 설명',
    doc_title: '멤버 가이드',
    source_url: 'https://riido.test/members',
    rank: 0.8,
  };

  it('keeps the default search response shape without loading contextual chunks', async () => {
    const { dataSource, redis, service } = createService();
    dataSource.query.mockResolvedValueOnce([primaryChunk]);

    const result = await service.search({ query: '관리자 권한', topK: 5 });

    expect(redis.get).toHaveBeenCalledWith('search:관리자 권한:top5:ctx0');
    expect(dataSource.query).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      success: true,
      data: {
        chunks: [
          {
            chunkId: 3,
            docId: 1,
            docTitle: '멤버 가이드',
            heading: '멤버 > 권한 > 관리자',
            content: '관리자 권한 설명',
            url: 'https://riido.test/members',
            score: 0.8,
          },
        ],
        cached: false,
        elapsedMs: expect.any(Number),
      },
    });
  });

  it('adds parent heading and adjacent chunks only when includeContext is true', async () => {
    const { dataSource, service } = createService();
    dataSource.query
      .mockResolvedValueOnce([primaryChunk])
      .mockResolvedValueOnce([
        {
          id: 1,
          doc_id: 1,
          chunk_index: 0,
          heading: '멤버 > 권한',
          content: '권한 개요',
          doc_title: '멤버 가이드',
          source_url: 'https://riido.test/members',
        },
        {
          id: 2,
          doc_id: 1,
          chunk_index: 1,
          heading: '멤버 > 권한 > 멤버',
          content: '멤버 권한 설명',
          doc_title: '멤버 가이드',
          source_url: 'https://riido.test/members',
        },
        primaryChunk,
        {
          id: 4,
          doc_id: 1,
          chunk_index: 3,
          heading: '멤버 > 권한 > 소유자',
          content: '소유자 권한 설명',
          doc_title: '멤버 가이드',
          source_url: 'https://riido.test/members',
        },
      ]);

    const result = await service.search(
      { query: '관리자 권한', topK: 5 },
      { includeContext: true },
    );

    expect(dataSource.query).toHaveBeenCalledTimes(2);
    expect(result.data.chunks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          chunkId: 1,
          heading: '멤버 > 권한',
          score: 0.8,
        }),
        expect.objectContaining({
          chunkId: 2,
          heading: '멤버 > 권한 > 멤버',
          score: 0.8,
        }),
        expect.objectContaining({
          chunkId: 4,
          heading: '멤버 > 권한 > 소유자',
          score: 0.8,
        }),
      ]),
    );
  });

  it('returns overlapping parent and adjacent context chunks only once', async () => {
    const { dataSource, service } = createService();
    dataSource.query
      .mockResolvedValueOnce([
        {
          ...primaryChunk,
          id: 2,
          chunk_index: 1,
          heading: '멤버 > 권한',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 1,
          doc_id: 1,
          chunk_index: 0,
          heading: '멤버',
          content: '멤버 개요',
          doc_title: '멤버 가이드',
          source_url: 'https://riido.test/members',
        },
        {
          ...primaryChunk,
          id: 2,
          chunk_index: 1,
          heading: '멤버 > 권한',
        },
      ]);

    const result = await service.search(
      { query: '권한', topK: 5 },
      { includeContext: true },
    );

    expect(
      result.data.chunks.filter((chunk) => chunk.chunkId === 1),
    ).toHaveLength(1);
  });

  it('uses separate cache keys for plain and contextual searches', async () => {
    const { dataSource, redis, service } = createService();
    dataSource.query.mockResolvedValue([]);

    await service.search({ query: '권한', topK: 3 });
    await service.search({ query: '권한', topK: 3 }, { includeContext: true });

    expect(redis.get).toHaveBeenNthCalledWith(1, 'search:권한:top3:ctx0');
    expect(redis.get).toHaveBeenNthCalledWith(2, 'search:권한:top3:ctx1');
    expect(redis.set.mock.calls.map(([key]) => key)).toEqual([
      'search:권한:top3:ctx0',
      'search:권한:top3:ctx1',
    ]);
  });
});

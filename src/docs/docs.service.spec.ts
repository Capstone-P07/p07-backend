import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DocsService } from './docs.service';
import { Document } from './entities/document.entity';
import { DocChunk } from './entities/doc-chunk.entity';
import { parseUrl } from './parsers/html.parser';

jest.mock('./parsers/html.parser', () => ({
  parseUrl: jest.fn(),
}));

const mockedParseUrl = parseUrl as jest.MockedFunction<typeof parseUrl>;

const makeFile = (content: string): Express.Multer.File =>
  ({
    buffer: Buffer.from(content, 'utf-8'),
    originalname: 'test.md',
    mimetype: 'text/markdown',
    size: content.length,
    fieldname: 'file',
    encoding: '7bit',
    destination: '',
    filename: '',
    path: '',
    stream: null as unknown as NodeJS.ReadableStream,
  }) as Express.Multer.File;

describe('DocsService', () => {
  let service: DocsService;
  let documentRepo: {
    save: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    createQueryBuilder: jest.Mock;
    exist: jest.Mock;
  };
  let chunkRepo: { save: jest.Mock; createQueryBuilder: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let txManager: { insert: jest.Mock; update: jest.Mock };

  beforeEach(async () => {
    mockedParseUrl.mockReset();
    txManager = { insert: jest.fn(), update: jest.fn() };
    documentRepo = {
      save: jest.fn(),
      create: jest.fn((x) => x),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
      exist: jest.fn(),
    };
    chunkRepo = { save: jest.fn(), createQueryBuilder: jest.fn() };
    dataSource = {
      transaction: jest.fn(async (cb: (m: typeof txManager) => Promise<unknown>) => cb(txManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocsService,
        { provide: getRepositoryToken(Document), useValue: documentRepo },
        { provide: getRepositoryToken(DocChunk), useValue: chunkRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(DocsService);
  });

  it('happy path: Markdown 업로드 → indexed 상태 반환', async () => {
    documentRepo.save.mockResolvedValueOnce({ id: 1, title: 't', status: 'indexing' });
    const md = '# 제목\n\n## 섹션\n\n' + '본문. '.repeat(30);

    const res = await service.create({ source: 'file', category: 'AI' }, makeFile(md));

    expect(documentRepo.save).toHaveBeenCalledTimes(1);
    expect(documentRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ title: '제목', category: 'AI', sourceUrl: null }),
    );
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(txManager.insert).toHaveBeenCalledWith(DocChunk, expect.any(Array));
    expect(txManager.update).toHaveBeenCalledWith(Document, 1, { status: 'indexed' });
    expect(res).toEqual({
      docId: 1,
      title: '제목',
      category: 'AI',
      indexStatus: 'indexed',
      message: '문서 등록이 완료되었습니다.',
    });
  });

  it('source=file 인데 file 없음 → BadRequest', async () => {
    await expect(service.create({ source: 'file', category: 'AI' }, undefined)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('category가 없거나 비어 있으면 BadRequest', async () => {
    const md = '# 제목\n\n## 섹션\n\n' + '본문. '.repeat(30);

    await expect(service.create({ source: 'file' }, makeFile(md))).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.create({ source: 'file', category: '   ' }, makeFile(md))).rejects.toThrow(
      BadRequestException,
    );
    expect(documentRepo.save).not.toHaveBeenCalled();
  });

  it('file 업로드에서 docs.riido.io URL은 sourceUrl로 저장한다', async () => {
    documentRepo.save.mockResolvedValueOnce({ id: 9, title: 'URL 문서', status: 'indexing' });
    const md = '# URL 문서\n\n## 섹션\n\n' + '색인 가능한 본문입니다. '.repeat(5);

    const res = await service.create(
      { source: 'file', category: 'AI', url: 'https://docs.riido.io/start' },
      makeFile(md),
    );

    expect(mockedParseUrl).not.toHaveBeenCalled();
    expect(documentRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'URL 문서',
        category: 'AI',
        sourceUrl: 'https://docs.riido.io/start',
      }),
    );
    expect(res).toEqual({
      docId: 9,
      title: 'URL 문서',
      category: 'AI',
      indexStatus: 'indexed',
      message: '문서 등록이 완료되었습니다.',
    });
  });

  it('docs.riido.io가 아닌 URL은 BadRequest', async () => {
    const md = '# 제목\n\n## 섹션\n\n' + '본문. '.repeat(30);

    await expect(
      service.create(
        { source: 'file', category: 'AI', url: 'https://example.com/start' },
        makeFile(md),
      ),
    ).rejects.toThrow(BadRequestException);
    expect(documentRepo.save).not.toHaveBeenCalled();
    expect(mockedParseUrl).not.toHaveBeenCalled();
  });

  it('source=url 등록 경로는 BadRequest', async () => {
    await expect(
      service.create({ source: 'url', category: 'AI', url: 'https://docs.riido.io/start' }, undefined),
    ).rejects.toThrow(BadRequestException);
    expect(mockedParseUrl).not.toHaveBeenCalled();
  });

  it('zero-chunk 파싱 결과 → failed 상태 업데이트 후 BadRequest', async () => {
    documentRepo.save.mockResolvedValueOnce({ id: 7, title: 'empty', status: 'indexing' });
    // 본문 없이 제목만 → 섹션 empty 또는 minChars 미달
    const md = '# 제목만';

    await expect(service.create({ source: 'file', category: 'AI' }, makeFile(md))).rejects.toThrow(
      BadRequestException,
    );
    expect(documentRepo.update).toHaveBeenCalledWith(7, { status: 'failed' });
  });

  describe('findAll', () => {
    it('응답에 문서별 실제 category를 포함한다', async () => {
      const qb = {
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            id: 3,
            title: 'AI 기능',
            source_url: 'https://docs.riido.io/ai',
            category: 'AI',
            status: 'indexed',
            updated_at: new Date('2026-04-24T07:00:00Z'),
            created_at: new Date('2026-04-24T06:00:00Z'),
            chunkCount: 4,
          },
          {
            id: 4,
            title: '기존 문서',
            source_url: null,
            category: null,
            status: 'pending',
            updated_at: null,
            created_at: new Date('2026-04-24T08:00:00Z'),
            chunkCount: 0,
          },
        ]),
      };
      documentRepo.createQueryBuilder.mockReturnValue(qb);

      const res = await service.findAll();

      expect(qb.orderBy).toHaveBeenCalledWith('d.created_at', 'DESC');
      expect(res.docs).toEqual([
        {
          docId: 3,
          title: 'AI 기능',
          category: 'AI',
          source: 'url',
          sourceValue: 'https://docs.riido.io/ai',
          chunkCount: 4,
          indexStatus: 'indexed',
          updatedAt: new Date('2026-04-24T07:00:00Z'),
        },
        {
          docId: 4,
          title: '기존 문서',
          category: null,
          source: 'file',
          sourceValue: null,
          chunkCount: 0,
          indexStatus: 'pending',
          updatedAt: new Date('2026-04-24T08:00:00Z'),
        },
      ]);
    });
  });

  describe('findOne', () => {
    it('happy path: 응답에 docId/title/source/chunkCount/indexStatus 매핑', async () => {
      const qb = {
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 2,
          title: '12_백로그',
          source_url: null,
          category: '작업 관리',
          status: 'indexed',
          created_at: new Date('2026-04-24T06:00:00Z'),
          updated_at: new Date('2026-04-24T06:30:00Z'),
          chunkCount: 8,
        }),
      };
      documentRepo.createQueryBuilder.mockReturnValue(qb);

      const res = await service.findOne(2);

      expect(qb.where).toHaveBeenCalledWith('d.id = :id', { id: 2 });
      expect(res).toEqual({
        docId: 2,
        title: '12_백로그',
        category: '작업 관리',
        source: 'file',
        sourceValue: null,
        chunkCount: 8,
        indexStatus: 'indexed',
        createdAt: new Date('2026-04-24T06:00:00Z'),
        updatedAt: new Date('2026-04-24T06:30:00Z'),
      });
    });

    it('없는 docId → NotFoundException', async () => {
      const qb = {
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      documentRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findChunks', () => {
    const makeQbMock = (rows: unknown[]) => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(rows),
    });

    it('기본: fts_vector 없이 청크 배열 반환', async () => {
      documentRepo.exist.mockResolvedValue(true);
      const qb = makeQbMock([
        { id: 6, chunk_index: 0, heading: '백로그 > 개요', content: '본문1' },
        { id: 7, chunk_index: 1, heading: '백로그 > 생성', content: '본문2' },
      ]);
      chunkRepo.createQueryBuilder.mockReturnValue(qb);

      const res = await service.findChunks(2);

      expect(documentRepo.exist).toHaveBeenCalledWith({ where: { id: 2 } });
      expect(qb.select).toHaveBeenCalledWith(['c.id', 'c.chunk_index', 'c.heading', 'c.content']);
      expect(qb.where).toHaveBeenCalledWith('c.doc_id = :id', { id: 2 });
      expect(qb.orderBy).toHaveBeenCalledWith('c.chunk_index', 'ASC');
      expect(qb.addSelect).not.toHaveBeenCalled();
      expect(res).toEqual({
        docId: 2,
        chunks: [
          { chunkId: 6, chunkIndex: 0, heading: '백로그 > 개요', content: '본문1' },
          { chunkId: 7, chunkIndex: 1, heading: '백로그 > 생성', content: '본문2' },
        ],
      });
    });

    it('includeFts=true: addSelect 호출 + 응답에 ftsVector 포함', async () => {
      documentRepo.exist.mockResolvedValue(true);
      const qb = makeQbMock([
        { id: 6, chunk_index: 0, heading: '백로그 > 개요', content: '본문1', fts_vector: "'개요':1 '백로그':2" },
      ]);
      chunkRepo.createQueryBuilder.mockReturnValue(qb);

      const res = await service.findChunks(2, { includeFts: true });

      expect(qb.addSelect).toHaveBeenCalledWith('c.fts_vector');
      expect(res.chunks[0]).toEqual({
        chunkId: 6,
        chunkIndex: 0,
        heading: '백로그 > 개요',
        content: '본문1',
        ftsVector: "'개요':1 '백로그':2",
      });
    });

    it('없는 docId → NotFoundException (QueryBuilder 호출 전)', async () => {
      documentRepo.exist.mockResolvedValue(false);

      await expect(service.findChunks(999)).rejects.toThrow(NotFoundException);
      expect(chunkRepo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });
});

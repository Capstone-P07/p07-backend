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
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
    exist: jest.Mock;
  };
  let chunkRepo: { save: jest.Mock; createQueryBuilder: jest.Mock };
  let dataSource: { transaction: jest.Mock; query: jest.Mock };
  let txManager: { delete: jest.Mock; insert: jest.Mock; update: jest.Mock };

  beforeEach(async () => {
    mockedParseUrl.mockReset();
    txManager = { delete: jest.fn(), insert: jest.fn(), update: jest.fn() };
    documentRepo = {
      save: jest.fn(),
      create: jest.fn((x) => x),
      update: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      exist: jest.fn(),
    };
    chunkRepo = { save: jest.fn(), createQueryBuilder: jest.fn() };
    dataSource = {
      transaction: jest.fn(async (cb: (m: typeof txManager) => Promise<unknown>) => cb(txManager)),
      query: jest.fn(),
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
    it('happy path: 응답에 docId/title/source/chunkCount/indexStatus와 chunk 기반 markdown 매핑', async () => {
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
      const chunkQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { id: 10, chunk_index: 0, heading: '12_백로그 > 개요', content: '백로그 본문입니다.' },
          { id: 11, chunk_index: 1, heading: '12_백로그 > 생성', content: '생성 본문입니다.' },
        ]),
      };
      chunkRepo.createQueryBuilder.mockReturnValue(chunkQb);

      const res = await service.findOne(2);

      expect(qb.where).toHaveBeenCalledWith('d.id = :id', { id: 2 });
      expect(chunkQb.orderBy).toHaveBeenCalledWith('c.chunk_index', 'ASC');
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
        markdown:
          '# 12_백로그\n\n## 개요\n\n백로그 본문입니다.\n\n## 생성\n\n생성 본문입니다.',
      });
    });

    it('공유 heading path는 반복 출력하지 않고 변경된 하위 heading만 복원한다', async () => {
      const qb = {
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          id: 3,
          title: '멤버',
          source_url: null,
          category: '권한 관리',
          status: 'indexed',
          created_at: new Date('2026-04-24T06:00:00Z'),
          updated_at: new Date('2026-04-24T06:30:00Z'),
          chunkCount: 4,
        }),
      };
      documentRepo.createQueryBuilder.mockReturnValue(qb);
      const chunkQb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { id: 20, chunk_index: 0, heading: '멤버 > 개요', content: '개요 본문입니다.' },
          { id: 21, chunk_index: 1, heading: '멤버 > 권한', content: '권한 본문입니다.' },
          {
            id: 22,
            chunk_index: 2,
            heading: '멤버 > 권한 > 관리자',
            content: '관리자 본문입니다.',
          },
          {
            id: 23,
            chunk_index: 3,
            heading: '멤버 > 권한 > 멤버',
            content: '멤버 본문입니다.',
          },
        ]),
      };
      chunkRepo.createQueryBuilder.mockReturnValue(chunkQb);

      const res = await service.findOne(3);

      expect(res.markdown).toBe(
        '# 멤버\n\n## 개요\n\n개요 본문입니다.\n\n## 권한\n\n권한 본문입니다.\n\n### 관리자\n\n관리자 본문입니다.\n\n### 멤버\n\n멤버 본문입니다.',
      );
      expect(res.markdown.match(/^# 멤버$/gm)).toHaveLength(1);
      expect(res.markdown.match(/^## 권한$/gm)).toHaveLength(1);
      expect(res.markdown.indexOf('개요 본문입니다.')).toBeLessThan(
        res.markdown.indexOf('권한 본문입니다.'),
      );
      expect(res.markdown.indexOf('권한 본문입니다.')).toBeLessThan(
        res.markdown.indexOf('관리자 본문입니다.'),
      );
      expect(res.markdown.indexOf('관리자 본문입니다.')).toBeLessThan(
        res.markdown.indexOf('멤버 본문입니다.'),
      );
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

  describe('update', () => {
    it('title/category만 바꾸면 청크를 교체하지 않고 메타데이터만 갱신한다', async () => {
      documentRepo.findOne.mockResolvedValue({
        id: 5,
        title: '기존 문서',
        category: '기존 카테고리',
        status: 'indexed',
      });

      const res = await service.update(5, { title: '수정 문서', category: 'AI' });

      expect(documentRepo.update).toHaveBeenCalledTimes(1);
      expect(documentRepo.update).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ title: '수정 문서', category: 'AI' }),
      );
      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(txManager.delete).not.toHaveBeenCalled();
      expect(res).toEqual({
        docId: 5,
        title: '수정 문서',
        indexStatus: 'indexed',
        message: '문서 메타데이터가 수정되었습니다.',
      });
    });

    it('markdown이 있으면 file보다 우선해 기존 청크를 새 청크로 교체한다', async () => {
      documentRepo.findOne.mockResolvedValue({
        id: 6,
        title: '기존 문서',
        category: '기존 카테고리',
        status: 'indexed',
      });
      const markdown = '# 마크다운 제목\n\n## 본문\n\n' + '마크다운 본문입니다. '.repeat(5);
      const file = makeFile('# 파일 제목\n\n## 본문\n\n' + '파일 본문입니다. '.repeat(5));

      const res = await service.update(6, { category: '가이드', markdown }, file);

      expect(documentRepo.update).toHaveBeenCalledWith(
        6,
        expect.objectContaining({ status: 'indexing' }),
      );
      expect(txManager.delete).toHaveBeenCalledWith(DocChunk, { docId: 6 });
      expect(txManager.insert).toHaveBeenCalledWith(
        DocChunk,
        expect.arrayContaining([
          expect.objectContaining({
            docId: 6,
            heading: '마크다운 제목 > 본문',
            content: expect.stringContaining('마크다운 본문입니다.'),
          }),
        ]),
      );
      expect(txManager.insert).not.toHaveBeenCalledWith(
        DocChunk,
        expect.arrayContaining([
          expect.objectContaining({ content: expect.stringContaining('파일 본문입니다.') }),
        ]),
      );
      expect(txManager.update).toHaveBeenCalledWith(
        Document,
        6,
        expect.objectContaining({ title: '마크다운 제목', category: '가이드', status: 'indexed' }),
      );
      expect(res).toEqual({
        docId: 6,
        title: '마크다운 제목',
        indexStatus: 'indexed',
        message: '문서 수정이 완료되었습니다. 재색인이 진행 중입니다.',
      });
    });

    it('색인 가능한 markdown이 아니면 기존 청크 교체 transaction을 실행하지 않는다', async () => {
      documentRepo.findOne.mockResolvedValue({
        id: 7,
        title: '기존 문서',
        category: '기존 카테고리',
        status: 'indexed',
      });

      await expect(service.update(7, { markdown: '# 제목만' })).rejects.toThrow(
        BadRequestException,
      );

      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(txManager.delete).not.toHaveBeenCalled();
      expect(documentRepo.update).not.toHaveBeenCalled();
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

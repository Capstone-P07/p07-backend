import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException, NotImplementedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DocsService } from './docs.service';
import { Document } from './entities/document.entity';
import { DocChunk } from './entities/doc-chunk.entity';

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
  let chunkRepo: { save: jest.Mock; find: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let txManager: { insert: jest.Mock; update: jest.Mock };

  beforeEach(async () => {
    txManager = { insert: jest.fn(), update: jest.fn() };
    documentRepo = {
      save: jest.fn(),
      create: jest.fn((x) => x),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
      exist: jest.fn(),
    };
    chunkRepo = { save: jest.fn(), find: jest.fn() };
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

    const res = await service.create({ source: 'file' }, makeFile(md));

    expect(documentRepo.save).toHaveBeenCalledTimes(1);
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(txManager.insert).toHaveBeenCalledWith(DocChunk, expect.any(Array));
    expect(txManager.update).toHaveBeenCalledWith(Document, 1, { status: 'indexed' });
    expect(res.indexStatus).toBe('indexed');
    expect(res.docId).toBe(1);
  });

  it('source=file 인데 file 없음 → BadRequest', async () => {
    await expect(service.create({ source: 'file' }, undefined)).rejects.toThrow(BadRequestException);
  });

  it('source=url → NotImplemented', async () => {
    await expect(
      service.create({ source: 'url', url: 'https://docs.riido.io/' }, undefined),
    ).rejects.toThrow(NotImplementedException);
  });

  it('zero-chunk 파싱 결과 → failed 상태 업데이트 후 BadRequest', async () => {
    documentRepo.save.mockResolvedValueOnce({ id: 7, title: 'empty', status: 'indexing' });
    // 본문 없이 제목만 → 섹션 empty 또는 minChars 미달
    const md = '# 제목만';

    await expect(service.create({ source: 'file' }, makeFile(md))).rejects.toThrow(BadRequestException);
    expect(documentRepo.update).toHaveBeenCalledWith(7, { status: 'failed' });
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
    it('happy path: chunks 배열 반환, chunk_index ASC', async () => {
      documentRepo.exist.mockResolvedValue(true);
      chunkRepo.find.mockResolvedValue([
        { id: 6, chunk_index: 0, heading: '백로그 > 개요', content: '본문1' },
        { id: 7, chunk_index: 1, heading: '백로그 > 생성', content: '본문2' },
      ]);

      const res = await service.findChunks(2);

      expect(documentRepo.exist).toHaveBeenCalledWith({ where: { id: 2 } });
      expect(chunkRepo.find).toHaveBeenCalledWith({
        where: { doc_id: 2 },
        order: { chunk_index: 'ASC' },
        select: ['id', 'chunk_index', 'heading', 'content'],
      });
      expect(res).toEqual({
        docId: 2,
        chunks: [
          { chunkId: 6, chunkIndex: 0, heading: '백로그 > 개요', content: '본문1' },
          { chunkId: 7, chunkIndex: 1, heading: '백로그 > 생성', content: '본문2' },
        ],
      });
    });

    it('없는 docId → NotFoundException (find 호출 전)', async () => {
      documentRepo.exist.mockResolvedValue(false);

      await expect(service.findChunks(999)).rejects.toThrow(NotFoundException);
      expect(chunkRepo.find).not.toHaveBeenCalled();
    });
  });
});

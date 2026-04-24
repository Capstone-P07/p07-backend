import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotImplementedException } from '@nestjs/common';
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
  let documentRepo: { save: jest.Mock; create: jest.Mock; update: jest.Mock; createQueryBuilder: jest.Mock };
  let chunkRepo: { save: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let txManager: { insert: jest.Mock; update: jest.Mock };

  beforeEach(async () => {
    txManager = { insert: jest.fn(), update: jest.fn() };
    documentRepo = {
      save: jest.fn(),
      create: jest.fn((x) => x),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    chunkRepo = { save: jest.fn() };
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
});

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { DocChunk } from './entities/doc-chunk.entity';
import { parseMarkdown } from './parsers/markdown.parser';
import { chunkSections, type ParsedSection } from './parsers/chunker';
import { CreateDocumentDto, CreateDocumentResponse } from './dto/create-document.dto';
import {
  DeleteDocumentResponse,
  ReindexDocumentResponse,
  UpdateDocumentDto,
  UpdateDocumentResponse,
} from './dto/update-document.dto';

@Injectable()
export class DocsService {
  private readonly logger = new Logger(DocsService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(DocChunk)
    private readonly chunkRepo: Repository<DocChunk>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    dto: CreateDocumentDto,
    file?: Express.Multer.File,
  ): Promise<CreateDocumentResponse> {
    if (dto.source === 'file') {
      if (!file) {
        throw new BadRequestException('source=file 일 때 file 필드는 필수입니다.');
      }
      const text = file.buffer.toString('utf-8');
      const parsed = parseMarkdown(text);
      return this.persist(dto.title ?? parsed.title, null, parsed.sections);
    }

    if (dto.source === 'url') {
      throw new NotImplementedException(
        'URL 등록은 아직 지원되지 않습니다. Markdown 파일 업로드를 사용하세요.',
      );
    }

    throw new BadRequestException('source는 file 또는 url 이어야 합니다.');
  }

  async findAll() {
    const rows = await this.documentRepo
      .createQueryBuilder('d')
      .loadRelationCountAndMap('d.chunkCount', 'd.chunks')
      .orderBy('d.created_at', 'DESC')
      .getMany();

    return {
      docs: rows.map((d) => ({
        docId: d.id,
        title: d.title,
        source: d.sourceUrl ? 'url' : 'file',
        sourceValue: d.sourceUrl ?? null,
        chunkCount: (d as Document & { chunkCount?: number }).chunkCount ?? 0,
        indexStatus: d.status,
        updatedAt: d.updatedAt ?? d.createdAt,
      })),
    };
  }

  async findOne(id: number) {
    const doc = await this.documentRepo
      .createQueryBuilder('d')
      .loadRelationCountAndMap('d.chunkCount', 'd.chunks')
      .where('d.id = :id', { id })
      .getOne();

    if (!doc) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    return {
      docId: doc.id,
      title: doc.title,
      source: doc.sourceUrl ? 'url' : 'file',
      sourceValue: doc.sourceUrl ?? null,
      chunkCount: (doc as Document & { chunkCount?: number }).chunkCount ?? 0,
      indexStatus: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt ?? doc.createdAt,
    };
  }

  async update(
    id: number,
    dto: UpdateDocumentDto,
    file?: Express.Multer.File,
  ): Promise<UpdateDocumentResponse> {
    const doc = await this.documentRepo.findOne({ where: { id } });
    if (!doc) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    // 파일 교체가 없으면 메타데이터(title)만 갱신
    if (!file) {
      if (dto.title === undefined) {
        return {
          docId: doc.id,
          title: doc.title,
          indexStatus: doc.status,
          message: '변경 사항이 없습니다.',
        };
      }
      await this.documentRepo.update(id, { title: dto.title, updatedAt: new Date() });
      return {
        docId: id,
        title: dto.title,
        indexStatus: doc.status,
        message: '문서 제목이 수정되었습니다.',
      };
    }

    // 파일 교체 → 기존 청크 삭제 + 재파싱/재청킹
    const text = file.buffer.toString('utf-8');
    const parsed = parseMarkdown(text);
    const chunks = chunkSections(parsed.sections);
    if (chunks.length === 0) {
      throw new BadRequestException('문서에서 색인 가능한 텍스트를 찾지 못했습니다.');
    }

    const newTitle = dto.title ?? parsed.title ?? doc.title;
    await this.documentRepo.update(id, { status: 'indexing', updatedAt: new Date() });

    try {
      await this.dataSource.transaction(async (m) => {
        await m.delete(DocChunk, { doc_id: id });
        await m.insert(
          DocChunk,
          chunks.map((c) => ({
            doc_id: id,
            chunk_index: c.chunkIndex,
            heading: c.heading,
            content: c.content,
          })),
        );
        await m.update(Document, id, {
          title: newTitle,
          status: 'indexed',
          updatedAt: new Date(),
        });
      });

      this.logger.log(`문서 재색인 완료: "${newTitle}" (${chunks.length} chunks, docId=${id})`);
      return {
        docId: id,
        title: newTitle,
        indexStatus: 'indexed',
        message: '문서 수정이 완료되었습니다. 재색인이 진행 중입니다.',
      };
    } catch (err: unknown) {
      try {
        await this.documentRepo.update(id, { status: 'failed' });
      } catch {
        this.logger.warn(`문서 상태를 failed로 갱신 실패 (docId=${id})`);
      }
      throw err;
    }
  }

  async remove(id: number): Promise<DeleteDocumentResponse> {
    const exists = await this.documentRepo.exist({ where: { id } });
    if (!exists) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    // ON DELETE CASCADE 로 doc_chunks 도 함께 삭제됨 (init.sql)
    const deletedChunks = await this.chunkRepo.count({ where: { docId: id } });
    await this.documentRepo.delete(id);

    this.logger.log(`문서 삭제 완료: docId=${id}, ${deletedChunks} chunks`);
    return {
      docId: id,
      deletedChunks,
      message: '문서 및 관련 색인이 삭제되었습니다.',
    };
  }

  async reindex(id: number): Promise<ReindexDocumentResponse> {
    const exists = await this.documentRepo.exist({ where: { id } });
    if (!exists) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    await this.documentRepo.update(id, { status: 'indexing', updatedAt: new Date() });

    try {
      // content 자체는 동일하지만 UPDATE 가 mecab-ko 트리거 (`doc_chunks_fts_update`) 를 다시 발화시켜
      // fts_vector 가 재생성된다. 청킹 룰 변경엔 의미 없고 FTS 설정 변경 시 인덱스 새로고침 용도.
      await this.dataSource.query(
        'UPDATE doc_chunks SET content = content WHERE doc_id = $1',
        [id],
      );
      await this.documentRepo.update(id, { status: 'indexed', updatedAt: new Date() });

      this.logger.log(`문서 재색인 (FTS 트리거 재실행) 완료: docId=${id}`);
      return { docId: id, indexStatus: 'indexed' };
    } catch (err: unknown) {
      try {
        await this.documentRepo.update(id, { status: 'failed' });
      } catch {
        this.logger.warn(`문서 상태를 failed로 갱신 실패 (docId=${id})`);
      }
      throw err;
    }
  }

  async findChunks(id: number, opts: { includeFts?: boolean } = {}) {
    const exists = await this.documentRepo.exist({ where: { id } });
    if (!exists) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    const qb = this.chunkRepo
      .createQueryBuilder('c')
      .select(['c.id', 'c.chunk_index', 'c.heading', 'c.content'])
      .where('c.doc_id = :id', { id })
      .orderBy('c.chunk_index', 'ASC');

    if (opts.includeFts) {
      qb.addSelect('c.fts_vector');
    }

    const chunks = await qb.getMany();

    return {
      docId: id,
      chunks: chunks.map((c) => ({
        chunkId: c.id,
        chunkIndex: c.chunkIndex,
        heading: c.heading,
        content: c.content,
        ...(opts.includeFts ? { ftsVector: c.ftsector } : {}),
      })),
    };
  }

  private async persist(
    title: string,
    sourceUrl: string | null,
    sections: ParsedSection[],
  ): Promise<CreateDocumentResponse> {
    const doc = await this.documentRepo.save(
      this.documentRepo.create({
        title,
        sourceUrl: sourceUrl,
        status: 'indexing',
      }),
    );

    try {
      const chunks = chunkSections(sections);
      if (chunks.length === 0) {
        // chunkSections 의 heading-only fallback 까지 통과 못한 케이스: 본문도 없고 heading 도 없는 빈 문서.
        throw new BadRequestException(
          '문서가 비어 있어 색인할 수 없습니다. 제목(#)이나 본문이 있는 Markdown을 업로드하세요.',
        );
      }

      await this.dataSource.transaction(async (m) => {
        await m.insert(
          DocChunk,
          chunks.map((c) => ({
            doc_id: doc.id,
            chunk_index: c.chunkIndex,
            heading: c.heading,
            content: c.content,
          })),
        );
        await m.update(Document, doc.id, { status: 'indexed' });
      });

      this.logger.log(`문서 색인 완료: "${title}" (${chunks.length} chunks, docId=${doc.id})`);
      return {
        docId: doc.id,
        title,
        indexStatus: 'indexed',
        message: '문서 등록이 완료되었습니다.',
      };
    } catch (err: unknown) {
      try {
        await this.documentRepo.update(doc.id, { status: 'failed' });
      } catch {
        // best-effort 상태 기록 — 여기서도 실패하면 로그만 남기고 원래 에러 재throw
        this.logger.warn(`문서 상태를 failed로 갱신 실패 (docId=${doc.id})`);
      }
      throw err;
    }
  }
}

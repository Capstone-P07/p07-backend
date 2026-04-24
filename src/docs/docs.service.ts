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
        source: d.source_url ? 'url' : 'file',
        sourceValue: d.source_url ?? null,
        chunkCount: (d as Document & { chunkCount?: number }).chunkCount ?? 0,
        indexStatus: d.status,
        updatedAt: d.updated_at ?? d.created_at,
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
      source: doc.source_url ? 'url' : 'file',
      sourceValue: doc.source_url ?? null,
      chunkCount: (doc as Document & { chunkCount?: number }).chunkCount ?? 0,
      indexStatus: doc.status,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at ?? doc.created_at,
    };
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
        chunkIndex: c.chunk_index,
        heading: c.heading,
        content: c.content,
        ...(opts.includeFts ? { ftsVector: c.fts_vector } : {}),
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
        source_url: sourceUrl,
        status: 'indexing',
      }),
    );

    try {
      const chunks = chunkSections(sections);
      if (chunks.length === 0) {
        throw new BadRequestException('문서에서 색인 가능한 텍스트를 찾지 못했습니다.');
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

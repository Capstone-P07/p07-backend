import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { DocChunk } from './entities/doc-chunk.entity';
import { parseHtml, parseUrl } from './parsers/html.parser';
import { parsePdf } from './parsers/pdf.parser';
import { chunkSections } from './parsers/chunker';
import { CreateDocumentDto, IndexUrlDto } from './dto/create-document.dto';

@Injectable()
export class DocsService implements OnModuleInit {
  private readonly logger = new Logger(DocsService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(DocChunk)
    private readonly chunkRepo: Repository<DocChunk>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    await this.setupFts();
  }

  /**
   * PostgreSQL FTS 트리거와 GIN 인덱스를 설정합니다.
   * 트리거: doc_chunks에 데이터가 INSERT/UPDATE될 때 fts_vector를 자동으로 계산합니다.
   * GIN 인덱스: fts_vector 컬럼에 빠른 전문 검색을 위한 인덱스입니다.
   */
  private async setupFts() {
    try {
      // tsvector 자동 갱신 트리거 함수
      await this.dataSource.query(`
        CREATE OR REPLACE FUNCTION update_fts_vector()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.fts_vector := to_tsvector('simple',
            coalesce(NEW.heading, '') || ' ' || coalesce(NEW.content, ''));
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      // 트리거 등록 (INSERT 또는 heading/content UPDATE 시 실행)
      await this.dataSource.query(`
        DROP TRIGGER IF EXISTS trg_update_fts_vector ON doc_chunks;
        CREATE TRIGGER trg_update_fts_vector
        BEFORE INSERT OR UPDATE OF heading, content ON doc_chunks
        FOR EACH ROW EXECUTE FUNCTION update_fts_vector();
      `);

      // GIN 인덱스 (전문 검색 성능을 위해)
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_doc_chunks_fts ON doc_chunks USING GIN(fts_vector);
      `);

      this.logger.log('FTS 트리거 및 GIN 인덱스 설정 완료');
    } catch (e) {
      this.logger.warn('FTS 설정 실패 (테이블이 아직 없을 수 있음): ' + e.message);
    }
  }

  /** 파일 업로드로 문서 색인 */
  async indexFromFile(file: Express.Multer.File, dto: CreateDocumentDto): Promise<Document> {
    const mime = file.mimetype;

    let parsed: { title: string; sections: { heading: string | null; content: string }[] };

    if (mime === 'application/pdf') {
      parsed = await parsePdf(file.buffer);
    } else if (mime === 'text/html' || file.originalname.endsWith('.html')) {
      parsed = parseHtml(file.buffer.toString('utf-8'));
    } else {
      throw new BadRequestException('PDF 또는 HTML 파일만 지원합니다.');
    }

    return this.saveDocumentWithChunks(
      dto.title || parsed.title,
      dto.category ?? null,
      null,
      parsed.sections,
    );
  }

  /** URL로 문서 색인 */
  async indexFromUrl(dto: IndexUrlDto): Promise<Document> {
    let parsed: { title: string; sections: { heading: string | null; content: string }[] };

    try {
      parsed = await parseUrl(dto.url);
    } catch (e) {
      throw new BadRequestException(`URL 파싱 실패: ${e.message}`);
    }

    return this.saveDocumentWithChunks(
      dto.title || parsed.title,
      dto.category ?? null,
      dto.url,
      parsed.sections,
    );
  }

  private async saveDocumentWithChunks(
    title: string,
    category: string | null,
    sourceUrl: string | null,
    sections: { heading: string | null; content: string }[],
  ): Promise<Document> {
    const doc = this.documentRepo.create({
      title,
      category,
      source_url: sourceUrl,
      status: 'indexing',
    });
    await this.documentRepo.save(doc);

    try {
      const chunks = chunkSections(sections);

      if (chunks.length === 0) {
        throw new BadRequestException('파싱 결과에서 텍스트를 찾을 수 없습니다.');
      }

      const chunkEntities = chunks.map((chunk) =>
        this.chunkRepo.create({
          doc_id: doc.id,
          chunk_index: chunk.chunkIndex,
          heading: chunk.heading,
          content: chunk.content,
        }),
      );

      await this.chunkRepo.save(chunkEntities);

      doc.status = 'indexed';
      await this.documentRepo.save(doc);

      this.logger.log(`문서 색인 완료: "${title}" (${chunks.length}개 청크)`);
      return doc;
    } catch (e) {
      doc.status = 'failed';
      await this.documentRepo.save(doc);
      throw e;
    }
  }

  async findAll(): Promise<Document[]> {
    return this.documentRepo.find({ order: { created_at: 'DESC' } });
  }

  async findOne(id: number): Promise<Document> {
    const doc = await this.documentRepo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException('문서를 찾을 수 없습니다.');
    return doc;
  }

  async getChunks(docId: number): Promise<DocChunk[]> {
    await this.findOne(docId); // 문서 존재 확인
    return this.chunkRepo.find({
      where: { doc_id: docId },
      order: { chunk_index: 'ASC' },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { DataSource, Repository } from 'typeorm';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchLog } from './entities/search-log.entity';

type SearchOptions = {
  includeContext?: boolean;
};

@Injectable()
export class SearchService {
  private readonly FTS_LANGUAGE = 'korean';

  constructor(
    @InjectDataSource() private dataSource: DataSource,
    @InjectRepository(SearchLog) private searchLogRepo: Repository<SearchLog>,
    @InjectRedis() private redis: Redis,
  ) {}

  async search(dto: SearchQueryDto, options: SearchOptions = {}) {
    const startTime = Date.now();
    const { query, topK = 5, sessionId } = dto;
    const includeContext = options.includeContext ?? false;

    const cacheKey = `search:${query}:top${topK}:ctx${includeContext ? 1 : 0}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      await this.searchLogRepo.save({
        sessionId: sessionId ?? null,
        query,
        matchedChunksJson: parsed.data.chunks,
        durationMs: 0,
      });
      return { ...parsed, data: { ...parsed.data, cached: true } };
    }

    const keywords = query
      .replace(/[^\w\s가-힣]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .join(' | ');

    const chunks = await this.dataSource.query(
      `
      SELECT
        dc.id,
        dc.doc_id,
        dc.chunk_index,
        dc.heading,
        dc.content,
        d.title        AS doc_title,
        d.source_url,
        ts_rank(dc.fts_vector, to_tsquery($1, $2)) AS rank
      FROM doc_chunks dc
      JOIN document d ON d.id = dc.doc_id
      WHERE
        dc.fts_vector @@ to_tsquery($1, $2)
        AND d.status = 'indexed'
      ORDER BY rank DESC
      LIMIT $3
      `,
      [this.FTS_LANGUAGE, keywords, topK],
    );
    const resultChunks = includeContext
      ? await this.addContextChunks(chunks)
      : chunks;
    const durationMs = Date.now() - startTime;

    await this.searchLogRepo.save({
      sessionId: sessionId ?? null,
      query,
      matchedChunksJson: resultChunks,
      durationMs,
    });

    const result = {
      success: true,
      data: {
        chunks: resultChunks.map((chunk) => this.mapSearchChunk(chunk)),
        cached: false,
        elapsedMs: durationMs,
      },
    };

    await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 600);

    return result;
  }

  async getTopFaqs(limit: number = 5) {
    const result = await this.searchLogRepo
      .createQueryBuilder('log')
      .select('log.query', 'question')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.query')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    return {
      success: true,
      data: {
        faqs: result.map((r, i) => ({
          rank: i + 1,
          question: r.question,
          count: parseInt(r.count),
        })),
      },
    };
  }

  private mapSearchChunk(chunk: any) {
    return {
      chunkId: chunk.id,
      docId: chunk.doc_id,
      docTitle: chunk.doc_title,
      heading: chunk.heading,
      content: chunk.content,
      url: chunk.source_url,
      score: chunk.rank,
    };
  }

  private async addContextChunks(chunks: any[]) {
    if (chunks.length === 0) {
      return chunks;
    }

    const docIds = [...new Set(chunks.map((chunk) => chunk.doc_id))];
    const docChunks = await this.dataSource.query(
      `
      SELECT
        dc.id,
        dc.doc_id,
        dc.chunk_index,
        dc.heading,
        dc.content,
        d.title        AS doc_title,
        d.source_url
      FROM doc_chunks dc
      JOIN document d ON d.id = dc.doc_id
      WHERE
        dc.doc_id = ANY($1)
        AND d.status = 'indexed'
      ORDER BY dc.doc_id ASC, dc.chunk_index ASC
      `,
      [docIds],
    );

    const chunksByDocId = new Map<number, any[]>();
    for (const chunk of docChunks) {
      const group = chunksByDocId.get(chunk.doc_id) ?? [];
      group.push(chunk);
      chunksByDocId.set(chunk.doc_id, group);
    }

    const result: any[] = [];
    const seenChunkIds = new Set<number>();
    const addChunk = (chunk: any, rank: number) => {
      if (seenChunkIds.has(chunk.id)) {
        return;
      }

      seenChunkIds.add(chunk.id);
      result.push({ ...chunk, rank });
    };

    for (const chunk of chunks) {
      addChunk(chunk, chunk.rank);
    }

    for (const primaryChunk of chunks) {
      const sameDocChunks = chunksByDocId.get(primaryChunk.doc_id) ?? [];
      const contextChunks = sameDocChunks.filter((candidate) => {
        const isParentHeading =
          candidate.heading &&
          primaryChunk.heading &&
          this.isStrictHeadingPrefix(candidate.heading, primaryChunk.heading);
        const isNeighbor =
          typeof candidate.chunk_index === 'number' &&
          typeof primaryChunk.chunk_index === 'number' &&
          Math.abs(candidate.chunk_index - primaryChunk.chunk_index) === 1;

        return isParentHeading || isNeighbor;
      });

      for (const contextChunk of contextChunks) {
        addChunk(contextChunk, primaryChunk.rank);
      }
    }

    return result;
  }

  private isStrictHeadingPrefix(
    candidateHeading: string,
    primaryHeading: string,
  ) {
    const candidateParts = this.splitHeading(candidateHeading);
    const primaryParts = this.splitHeading(primaryHeading);

    return (
      candidateParts.length > 0 &&
      candidateParts.length < primaryParts.length &&
      candidateParts.every((part, index) => part === primaryParts[index])
    );
  }

  private splitHeading(heading: string) {
    return heading
      .split('>')
      .map((part) => part.trim())
      .filter(Boolean);
  }
}

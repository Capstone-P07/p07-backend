import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchLog } from './entities/search-log.entity';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class SearchService {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    @InjectRepository(SearchLog) private searchLogRepo: Repository<SearchLog>,
    @InjectRedis() private redis: Redis,
  ) {}

  private readonly FTS_LANGUAGE = 'korean';
  
  // 고도화 필요 - 쿼리 정규화 로직
  // 사용자 질문 원문 저장 -> llm 연동 후 정규화된 질문 저장
  // ex) 멤버는 어떻게 초대하나요? -> 멤버 초대 방법
  async search(dto: SearchQueryDto) {
    const startTime = Date.now();
    const { query, topK = 5, sessionId } = dto;

    //캐시 체크 -> 캐시 히트시 cached:true로 리턴
    const cacheKey = `search:${query}:top${topK}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      await this.searchLogRepo.save({
        sessionId: sessionId ?? null,
        query,
        matchedChunksJson: JSON.parse(cached).data.chunks,
        durationMs: 0,
      });
      return { ...JSON.parse(cached), data: { ...JSON.parse(cached).data, cached: true } };
    }

    //키워드 추출 --> to_tsquery 파라미터로 사용
    const keywords = query
      .replace(/[^\w\s가-힣]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .join(' | ');  // "프로젝트 생성" → "프로젝트 | 생성"

    //FTS 쿼리 실행
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

    const durationMs = Date.now() - startTime;

    //search_logs 저장
    await this.searchLogRepo.save({
      sessionId: sessionId ?? null,
      query,
      matchedChunksJson: chunks,
      durationMs,
    });

    const result = {
        success: true,
        data: {
            chunks: chunks.map((chunk) => ({
                chunkId: chunk.id,
                docId: chunk.doc_id,
                docTitle: chunk.doc_title, // 문서 제목
                heading: chunk.heading, // 소제목
                content: chunk.content,
                url: chunk.source_url,
                score: chunk.rank,
            })),
        cached: false,
        elapsedMs: durationMs,
        },
    };

    //캐시 저장
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
}
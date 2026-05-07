import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UnansweredQuestion } from './entities/unanswered-question.entity';
import { Feedback } from './entities/feedback.entity';
import { ChatLog } from '../chat/entities/chat-log.entity';
import { SearchLog } from '../search/entities/search-log.entity';
import { Document } from '../docs/entities/document.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(UnansweredQuestion)
    private unansweredRepo: Repository<UnansweredQuestion>,
    @InjectRepository(Feedback)
    private feedbackRepo: Repository<Feedback>,
    @InjectRepository(ChatLog)
    private chatLogRepo: Repository<ChatLog>,
    @InjectRepository(SearchLog)
    private searchLogRepo: Repository<SearchLog>,
    @InjectRepository(Document)
    private documentRepo: Repository<Document>,
    private dataSource: DataSource,
  ) {}

  /**
   * FR-032: 전체 현황 통계
   * - 총 대화 세션 수
   * - 총 질문 수 (사용자 메시지)
   * - 만족도 (thumb_up 비율)
   * - 미답변 질문 수
   */
  async getOverview() {
    const [totalQuestions, totalFeedback, thumbUp, totalUnanswered, totalDocs] =
      await Promise.all([
        // 사용자가 보낸 메시지 수 = 총 질문 수
        this.chatLogRepo.count({ where: { role: 'user' } }),

        // 전체 피드백 수
        this.feedbackRepo.count(),

        // 긍정 피드백 수
        this.feedbackRepo.count({ where: { rating: 'thumb_up' } }),

        // 미답변 질문 수 (unresolved 상태)
        this.unansweredRepo.count({ where: { status: 'unresolved' } }),

        // 색인된 문서 수
        this.documentRepo.count({ where: { status: 'indexed' } }),
      ]);

    // 만족도: 피드백이 하나라도 있을 때만 계산
    const satisfactionRate =
      totalFeedback > 0
        ? Math.round((thumbUp / totalFeedback) * 100)
        : null;

    return {
      totalQuestions,
      totalFeedback,
      satisfactionRate,   // 퍼센트 (0~100), 피드백 없으면 null
      totalUnanswered,
      totalIndexedDocs: totalDocs,
    };
  }

  /**
   * FR-006 / FR-032: 자주 묻는 질문 Top N
   * search_logs 에서 동일 query 를 집계
   */
  async getTopQueries(limit = 10) {
    const rows = await this.searchLogRepo
      .createQueryBuilder('sl')
      .select('sl.query', 'query')
      .addSelect('COUNT(*)', 'count')
      .groupBy('sl.query')
      .orderBy('COUNT(*)', 'DESC')
      .limit(limit)
      .getRawMany<{ query: string; count: string }>();

    return rows.map((r) => ({ query: r.query, count: Number(r.count) }));
  }

  /**
   * FR-033: 만족도 통계 (일별 추이)
   */
  async getSatisfactionStats() {
    // 전체 비율
    const total = await this.feedbackRepo.count();
    const thumbUp = await this.feedbackRepo.count({
      where: { rating: 'thumb_up' },
    });
    const thumbDown = total - thumbUp;

    // 일별 추이 (최근 30일)
    const daily = await this.dataSource.query<
      { date: string; thumb_up: string; thumb_down: string }[]
    >(`
      SELECT
        DATE_TRUNC('day', created_at)::date AS date,
        COUNT(*) FILTER (WHERE rating = 'thumb_up')  AS thumb_up,
        COUNT(*) FILTER (WHERE rating = 'thumb_down') AS thumb_down
      FROM feedback
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date ASC
    `);

    return {
      summary: {
        total,
        thumbUp,
        thumbDown,
        satisfactionRate: total > 0 ? Math.round((thumbUp / total) * 100) : null,
      },
      daily: daily.map((r) => ({
        date: r.date,
        thumbUp: Number(r.thumb_up),
        thumbDown: Number(r.thumb_down),
      })),
    };
  }

  /**
   * FR-034: 미답변 질문 통계
   */
  async getUnansweredStats() {
    // 사유별 집계
    const byReason = await this.unansweredRepo
      .createQueryBuilder('uq')
      .select('uq.reason', 'reason')
      .addSelect('COUNT(*)', 'count')
      .groupBy('uq.reason')
      .getRawMany<{ reason: string; count: string }>();

    // 상태별 집계
    const byStatus = await this.unansweredRepo
      .createQueryBuilder('uq')
      .select('uq.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('uq.status')
      .getRawMany<{ status: string; count: string }>();

    // 전체 질문 수 대비 미답변 비율
    const totalQuestions = await this.chatLogRepo.count({
      where: { role: 'user' },
    });
    const totalUnanswered = await this.unansweredRepo.count();
    const unansweredRate =
      totalQuestions > 0
        ? Math.round((totalUnanswered / totalQuestions) * 100)
        : 0;

    return {
      unansweredRate,     // 퍼센트
      totalUnanswered,
      byReason: byReason.map((r) => ({
        reason: r.reason,
        count: Number(r.count),
      })),
      byStatus: byStatus.map((r) => ({
        status: r.status,
        count: Number(r.count),
      })),
    };
  }

  /**
   * FR-035: 문서별 활용 통계
   * - 상태별 문서 수
   * - search_logs 의 matched_chunks_json 에서 doc_id 집계
   */
  async getDocumentStats() {
    // 상태별 문서 수
    const byStatus = await this.documentRepo
      .createQueryBuilder('d')
      .select('d.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('d.status')
      .getRawMany<{ status: string; count: string }>();

    // 검색에서 가장 많이 히트된 문서 Top 10
    // matched_chunks_json 은 [{doc_id, ...}, ...] 형태
    const topDocs = await this.dataSource.query<
      { doc_id: string; title: string; hit_count: string }[]
    >(`
      SELECT
        d.id   AS doc_id,
        d.title,
        COUNT(*) AS hit_count
      FROM search_logs sl
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE jsonb_typeof(sl.matched_chunks_json)
          WHEN 'array' THEN sl.matched_chunks_json
          ELSE '[]'::jsonb
        END
      ) AS chunk
      JOIN document d ON d.id = (chunk->>'doc_id')::int
      WHERE sl.matched_chunks_json IS NOT NULL
      GROUP BY d.id, d.title
      ORDER BY hit_count DESC
      LIMIT 10
    `);

    return {
      byStatus: byStatus.map((r) => ({
        status: r.status,
        count: Number(r.count),
      })),
      topDocuments: topDocs.map((r) => ({
        docId: Number(r.doc_id),
        title: r.title,
        hitCount: Number(r.hit_count),
      })),
    };
  }

  /**
   * FR-029: 미답변 질문 목록 (페이지네이션)
   */
  async getUnansweredList(page = 1, limit = 20, status?: string) {
    const qb = this.unansweredRepo
      .createQueryBuilder('uq')
      .orderBy('uq.frequency', 'DESC')
      .addOrderBy('uq.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      qb.where('uq.status = :status', { status });
    }

    const [items, total] = await qb.getManyAndCount();

    return {
      total,
      page,
      limit,
      items,
    };
  }
}

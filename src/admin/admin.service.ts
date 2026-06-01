import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, In } from 'typeorm';
import { UnansweredQuestion } from './entities/unanswered-question.entity';
import { Feedback } from './entities/feedback.entity';
import { ChatLog } from '../chat/entities/chat-log.entity';
import { SearchLog } from '../search/entities/search-log.entity';
import { Document } from '../docs/entities/document.entity';
import { UpdateUnansweredDto } from './dto/update-unanswered.dto';

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
  async getOverview(period?: string) {
    const now = new Date();
    const from = new Date();
    if (period === 'today') {
      from.setHours(0, 0, 0, 0);
    } else if (period === '7d') {
      from.setDate(now.getDate() - 7);
    } else if (period === '30d') {
      from.setDate(now.getDate() - 30);
    } else {
      from.setFullYear(2000); // 전체 기간
    }
    const [totalQuestions, totalFeedback, thumbUp, totalUnanswered, totalDocs] =
      await Promise.all([
        // 사용자가 보낸 메시지 수 = 총 질문 수
        this.chatLogRepo.count({ where: { role: 'user', ...(period !== 'all' && { createdAt: Between(from, now) })} }),

        // 전체 피드백 수
        this.feedbackRepo.count({where: {...(period !== 'all' && { createdAt: Between(from, now) })}}),

        // 긍정 피드백 수
        this.feedbackRepo.count({ where: { rating: 'thumb_up', ...(period !== 'all' && { createdAt: Between(from, now) }) } }),

        // 미답변 질문 수 (unresolved, out_of_scope)
        this.chatLogRepo.count({ 
          where: { 
            role: 'assistant',
            responseType: In(['out_of_scope', 'no_document']),
            ...(period !== 'all' && { createdAt: Between(from, now) })
          }
        }),
        // 색인된 문서 수
        this.documentRepo.count({ where: { status: 'indexed', ...(period !== 'all' && { createdAt: Between(from, now) }) } }),
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
  async getTopQueries(limit = 10, period?: string) {
    const now = new Date();
    const from = new Date();
    if (period === 'today') from.setHours(0, 0, 0, 0);
    else if (period === '7d') from.setDate(now.getDate() - 7);
    else if (period === '30d') from.setDate(now.getDate() - 30);
    else from.setFullYear(2000);

    const rows = await this.searchLogRepo
      .createQueryBuilder('sl')
      .select('sl.query', 'query')
      .addSelect('COUNT(*)', 'count')
      .where(period !== 'all' ? 'sl.createdAt BETWEEN :from AND :now' : '1=1', { from, now })
      .groupBy('sl.query')
      .orderBy('COUNT(*)', 'DESC')
      .limit(limit)
      .getRawMany<{ query: string; count: string }>();

    return rows.map((r) => ({ query: r.query, count: Number(r.count) }));
  }

  /**
   * FR-033: 만족도 통계 (일별 추이)
   */
  async getSatisfactionStats(period?: string) {
    const now = new Date();
    const from = new Date();
    if (period === 'today') from.setHours(0, 0, 0, 0);
    else if (period === '7d') from.setDate(now.getDate() - 7);
    else if (period === '30d') from.setDate(now.getDate() - 30);
    else from.setFullYear(2000);

    const whereClause = period !== 'all'
      ? `WHERE created_at BETWEEN '${from.toISOString()}' AND '${now.toISOString()}'`
      : '';

    // 전체 비율
    const total = await this.feedbackRepo.count({
      where: { ...(period !== 'all' && { createdAt: Between(from, now) }) }
    });
    const thumbUp = await this.feedbackRepo.count({
      where: { rating: 'thumb_up', ...(period !== 'all' && { createdAt: Between(from, now) }) },
    });
    const thumbDown = total - thumbUp;

    // 일별 추이 (최근 30일)
    const daily = await this.dataSource.query<
      { date: string; thumbUp: string; thumbDown: string }[]
    >(`
      SELECT
        TO_CHAR(DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Seoul'), 'YYYY-MM-DD') AS date,
        COUNT(*) FILTER (WHERE rating = 'thumb_up')  AS "thumbUp",
        COUNT(*) FILTER (WHERE rating = 'thumb_down') AS "thumbDown"
      FROM feedback
      ${whereClause}
      GROUP BY DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Seoul')
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
        thumbUp: Number(r.thumbUp),
        thumbDown: Number(r.thumbDown),
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
    // matched_chunks_json 은 [{docId, ...}, ...] 형태
    const topDocs = await this.dataSource.query<
      { docId: string; title: string; hitCount: string }[]
    >(`
      SELECT
        d.id   AS "docId",
        d.title,
        COUNT(*) AS "hitCount"
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
      ORDER BY "hitCount" DESC
      LIMIT 10
    `);

    return {
      byStatus: byStatus.map((r) => ({
        status: r.status,
        count: Number(r.count),
      })),
      topDocuments: topDocs.map((r) => ({
        docId: Number(r.docId),
        title: r.title,
        hitCount: Number(r.hitCount),
      })),
    };
  }

  /**
   * FR-029: 미답변 질문 목록 (페이지네이션)
   */
  async getUnansweredList(
    page = 1,
    limit = 20,
    status?: string,
    sort: 'frequency' | 'latest' = 'frequency',
  ) {
    const qb = this.unansweredRepo.createQueryBuilder('uq');

    if (sort === 'latest') {
      qb.orderBy('uq.updatedAt', 'DESC').addOrderBy('uq.createdAt', 'DESC');
    } else {
      qb.orderBy('uq.frequency', 'DESC').addOrderBy('uq.createdAt', 'DESC');
    }

    qb.skip((page - 1) * limit).take(limit);

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

  async updateUnansweredStatus(id: number, dto: UpdateUnansweredDto) {
    const item = await this.unansweredRepo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Unanswered question ${id} not found`);
    }

    if (dto.status === 'resolved') {
      if (!dto.resolvedBy) {
        throw new BadRequestException('resolved 처리에는 resolvedBy 문서 ID가 필요합니다.');
      }
      const docExists = await this.documentRepo.exist({ where: { id: dto.resolvedBy } });
      if (!docExists) {
        throw new BadRequestException(`Document ${dto.resolvedBy} not found`);
      }
      item.resolvedBy = dto.resolvedBy;
    } else {
      item.resolvedBy = null;
    }

    item.status = dto.status;
    const saved = await this.unansweredRepo.save(item);

    return {
      id: saved.id,
      status: saved.status,
      resolvedBy: saved.resolvedBy ?? null,
      updatedAt: saved.updatedAt,
    };
  }
  
  async getDailyStats(period?: string) {
    const now = new Date();
    const from = new Date();
    if (period === 'today') from.setHours(0, 0, 0, 0);
    else if (period === '7d') from.setDate(now.getDate() - 7);
    else if (period === '30d') from.setDate(now.getDate() - 30);
    else from.setFullYear(2000);

    const successRows = await this.dataSource.query(
      `SELECT TO_CHAR(DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Seoul'), 'YYYY-MM-DD') AS date, 
      COUNT(*) AS success
      FROM chat_logs
      WHERE role = 'assistant' AND response_type = 'success' AND created_at BETWEEN $1 AND $2
      GROUP BY DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Seoul')
      ORDER BY DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Seoul') ASC`,
      [from, now],
    );

    const failureRows = await this.dataSource.query(
      `SELECT TO_CHAR(DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Seoul'), 'YYYY-MM-DD') AS date,
      COUNT(*) AS failure
      FROM chat_logs
      WHERE role = 'assistant' AND response_type IN ('out_of_scope', 'no_document') AND created_at BETWEEN $1 AND $2
      GROUP BY DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Seoul')
      ORDER BY DATE_TRUNC('day', created_at AT TIME ZONE 'Asia/Seoul') ASC`,
      [from, now],
    );

    const successMap = new Map<string, number>(successRows.map((r: any) => [String(r.date), Number(r.success)]));
    const failureMap = new Map<string, number>(failureRows.map((r: any) => [String(r.date), Number(r.failure)]));

    const allDates = new Set<string>([...successMap.keys(), ...failureMap.keys()]);

    return [...allDates]
      .sort()  // YYYY-MM-DD 형식이라 문자열 정렬로 날짜 순서 맞음
      .map((date: string) => ({
        date: date,
        success: successMap.get(date) ?? 0,
        failure: failureMap.get(date) ?? 0,
      }));
    }
}

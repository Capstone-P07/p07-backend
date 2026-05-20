import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatLog } from '../chat/entities/chat-log.entity';
import { Session } from '../sessions/entities/session.entity';
import { Feedback } from './entities/feedback.entity';

@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(ChatLog) private chatLogRepo: Repository<ChatLog>,
    @InjectRepository(Session) private sessionRepo: Repository<Session>,
    @InjectRepository(Feedback) private feedbackRepo: Repository<Feedback>,
  ) {}

  async getChatHistory(userId: string) {
    const sessions = await this.sessionRepo
      .createQueryBuilder('session')
      .where('session.userId = :userId', { userId })
      .orderBy('session.createdAt', 'DESC')
      .getMany();

    const result = await Promise.all(
      sessions.map(async (session) => {
        const logs = await this.chatLogRepo.find({
          where: { sessionId: session.id },
          order: { createdAt: 'ASC' },
        });

        const preview = logs.find(l => l.role === 'user')?.message ?? '';
        const messageCount = logs.length;

        return {
          sessionId: session.id,
          startedAt: session.createdAt,
          endedAt: session.expiresAt,
          messageCount,
          preview,
        };
      }),
    );

    return {
      success: true,
      data: {
        total: result.length,
        sessions: result,
      },
    };
  }

  async getSessionLogs(sessionId: string) {
    const logs = await this.chatLogRepo.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });

    return {
      success: true,
      data: {
        sessionId,
        logs: logs.map(log => ({
          logId: log.id,
          role: log.role,
          content: log.message,
          references: log.referencesJson ?? [],
          createdAt: log.createdAt,
        })),
      },
    };
  }

  async deleteSession(sessionId: string, userId: string) {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId, userId } });
    if (!session) return { success: false, data: null, error: { code: 'NOT_FOUND', message: '세션을 찾을 수 없습니다.' } };

    await this.chatLogRepo.delete({ sessionId });
    await this.sessionRepo.delete({ id: sessionId });

    return { success: true, data: { message: '대화가 삭제되었습니다.' }, error: null };
  }

  async saveFeedback(logId: number, rating: 'thumb_up' | 'thumb_down', comment?: string) {
    const existing = await this.feedbackRepo.findOne({ where: { chatLogsId: logId } });
    if (existing) {
      existing.rating = rating;
      existing.comment = comment ?? null;
      await this.feedbackRepo.save(existing);
    } else {
      await this.feedbackRepo.save({ chatLogsId: logId, rating, comment: comment ?? null });
    }
    return { success: true, data: { message: '피드백이 저장되었습니다.' }, error: null };
  }
}
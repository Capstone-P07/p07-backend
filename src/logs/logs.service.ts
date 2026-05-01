import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatLog } from '../chat/entities/chat-log.entity';
import { Session } from '../sessions/entities/session.entity';

@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(ChatLog) private chatLogRepo: Repository<ChatLog>,
    @InjectRepository(Session) private sessionRepo: Repository<Session>,
  ) {}

  // 사용자 세션 목록 조회
  async getChatHistory(userId: string) {
    const sessions = await this.sessionRepo
      .createQueryBuilder('session')
      .where('session.userId = :userId', { userId })
      .orderBy('session.createdAt', 'DESC') //내림차순
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

  // 특정 세션 메시지 목록 조회
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
          createdAt: log.createdAt,
        })),
      },
    };
  }
}
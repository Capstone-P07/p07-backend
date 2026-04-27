import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { Session } from './entities/session.entity';
import { CreateSessionDto } from './dto/create-session.dto';

@Injectable()
export class SessionsService {
  private readonly SESSION_TTL = 60 * 30; //30분

  constructor(
    @InjectRepository(Session) private sessionRepo: Repository<Session>,
    @InjectRedis() private redis: Redis,
  ) {}

  //세션 생성
  async createSession(dto: CreateSessionDto) {
    
    const createdAt = Date.now();
    const expiresAt = new Date(Date.now() + this.SESSION_TTL * 1000);

    const session = await this.sessionRepo.save({
      userId: dto.userId ?? null,
      expiresAt,
    });

    // Redis 캐싱
    await this.redis.set(
      `session:${session.id}`,
      JSON.stringify(session),
      'EX',
      this.SESSION_TTL,
    );

    return {
      success: true,
      data: {
        sessionId: session.id,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      },
    };
  }

  async getSession(sessionId: string) {
    //캐시 확인
    const cached = await this.redis.get(`session:${sessionId}`);
    if (cached) {
      //30분 리셋
      await this.redis.expire(`session:${sessionId}`, this.SESSION_TTL);
      return {
        success: true,
        data: JSON.parse(cached),
      };
    }

    //Redis 만료 시 DB 확인
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      return {
        success: false,
        data: null,
        error: { code: 'NOT_FOUND', message: '세션이 존재하지 않습니다.' },
      };
    }

    return {
      success: true,
      data: session,
    };
  }

  //세션 삭제
  async deleteSession(sessionId: string) {
  
    await this.redis.del(`session:${sessionId}`);
    await this.sessionRepo.delete({ id: sessionId });

    return {
      success: true,
      data: null,
    };
  }
}
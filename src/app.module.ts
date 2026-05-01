import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { SearchModule } from './search/search.module';
import { DocsModule } from './docs/docs.module';
import { AdminModule } from './admin/admin.module';
import { SessionsModule } from './sessions/sessions.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { LogsModule } from './logs/logs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // 개발 전용 — 운영에서는 false 로 바꾸고 마이그레이션 도구 사용
    }),
    RedisModule.forRoot({
      type: 'single',
      url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    }),  
    
    AuthModule,
    ChatModule,
    SearchModule,
    DocsModule,
    AdminModule,
    SessionsModule,
    LogsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

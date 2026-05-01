import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogsController } from './logs.controller';
import { LogsService } from './logs.service';
import { ChatLog } from '../chat/entities/chat-log.entity';
import { Session } from '../sessions/entities/session.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatLog, Session]),
    AuthModule,
  ],
  controllers: [LogsController],
  providers: [LogsService],
})
export class LogsModule {}
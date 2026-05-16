import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { LlmService } from './llm.service';
import { AuthModule } from '../auth/auth.module';
import { SearchModule } from '../search/search.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatLog } from './entities/chat-log.entity';
import { UnansweredQuestion } from '../admin/entities/unanswered-question.entity';

@Module({
  imports: [
    AuthModule, 
    SearchModule,
    TypeOrmModule.forFeature([ChatLog, UnansweredQuestion]),
  ],
  controllers: [ChatController],
  providers: [ChatService, LlmService]
})
export class ChatModule {}

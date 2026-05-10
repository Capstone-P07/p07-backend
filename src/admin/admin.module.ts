import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UnansweredQuestion } from './entities/unanswered-question.entity';
import { Feedback } from './entities/feedback.entity';
import { ChatLog } from '../chat/entities/chat-log.entity';
import { SearchLog } from '../search/entities/search-log.entity';
import { Document } from '../docs/entities/document.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UnansweredQuestion,
      Feedback,
      ChatLog,
      SearchLog,
      Document,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}

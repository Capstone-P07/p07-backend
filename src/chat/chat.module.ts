import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { LlmClientService } from './llm/llm-client.service';
import { FeedbackController } from './feedback/feedback.controller';
import { FeedbackService } from './feedback/feedback.service';

@Module({
  controllers: [ChatController, FeedbackController],
  providers: [ChatService, LlmClientService, FeedbackService],
  exports: [ChatService],
})
export class ChatModule {}

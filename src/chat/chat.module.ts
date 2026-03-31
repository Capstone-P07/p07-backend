import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { LlmClientService } from './llm/llm-client.service';

@Module({
  controllers: [ChatController],
  providers: [ChatService, LlmClientService],
  exports: [ChatService],
})
export class ChatModule {}

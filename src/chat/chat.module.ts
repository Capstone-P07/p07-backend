import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AuthModule } from '../auth/auth.module';
import { SearchModule } from '../search/search.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatLog } from './entities/chat-log.entity';

@Module({
  imports: [
    AuthModule, 
    SearchModule,
    TypeOrmModule.forFeature([ChatLog]),
  ],
  controllers: [ChatController],
  providers: [ChatService]
})
export class ChatModule {}

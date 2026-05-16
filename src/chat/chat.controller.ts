import { Controller, Param, Query, Req, UseGuards, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ChatService } from './chat.service';
import { JwtOptionalAuthGuard } from '../auth/jwt-auth.guard';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Sse('message/:sessionId')
  @UseGuards(JwtOptionalAuthGuard)
  sendMessage(
    @Param('sessionId') sessionId: string,
    @Query('question') question: string,
    @Req() req: any,
  ): Observable<MessageEvent>{
    const userId = req.user?.userId ?? null;
    return this.chatService.sendMessage(question, sessionId, userId);
  }
}
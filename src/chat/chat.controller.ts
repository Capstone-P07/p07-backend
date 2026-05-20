import { Controller, Param, Query, Req, Sse, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiProduces, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { JwtOptionalAuthGuard } from '../auth/jwt-auth.guard';
import { ChatService } from './chat.service';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Sse('message/:sessionId')
  @UseGuards(JwtOptionalAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: '챗봇 메시지 스트리밍',
    description: '질문을 받아 문서 기반 답변을 Server-Sent Events로 스트리밍합니다. JWT는 선택 인증입니다.',
  })
  @ApiProduces('text/event-stream')
  @ApiParam({ name: 'sessionId', description: '채팅 세션 ID' })
  @ApiQuery({ name: 'question', description: '사용자 질문', example: 'Riido에서 프로젝트는 어떻게 생성하나요?' })
  @ApiOkResponse({ description: 'text/event-stream 형식의 답변 스트림을 반환합니다.' })
  sendMessage(
    @Param('sessionId') sessionId: string,
    @Query('question') question: string,
    @Req() req: any,
  ): Observable<MessageEvent> {
    const userId = req.user?.userId ?? null;
    return this.chatService.sendMessage(question, sessionId, userId);
  }
}

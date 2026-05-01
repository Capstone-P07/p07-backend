import { Controller, Post, Param, Body, Res, Req, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtOptionalAuthGuard } from '../auth/jwt-auth.guard';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('message/:sessionId')
  @UseGuards(JwtOptionalAuthGuard)
  sendMessage(
    @Param('sessionId') sessionId: string,
    @Body() dto: SendMessageDto,
    @Req() req: any,
    @Res() res: any,
  ) {
    const userId = req.user?.userId ?? null;
    return this.chatService.sendMessage(dto, sessionId, userId, res);
  }
}
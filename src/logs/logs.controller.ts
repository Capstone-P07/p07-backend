import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { LogsService } from './logs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  // 사용자 세션 목록 조회 (로그인 필수)
  @Get('chat/history')
  @UseGuards(JwtAuthGuard)
  getChatHistory(@Req() req: any) {
    const userId = req.user.userId;
    return this.logsService.getChatHistory(userId);
  }

  // 특정 세션 메시지 조회
  @Get('chat')
  getSessionLogs(@Query('sessionId') sessionId: string) {
    return this.logsService.getSessionLogs(sessionId);
  }
}
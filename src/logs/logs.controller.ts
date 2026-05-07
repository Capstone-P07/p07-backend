import { Controller, Get, Delete, Post, Param, Query, Body, Req, UseGuards } from '@nestjs/common';
import { LogsService } from './logs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get('chat/history')
  @UseGuards(JwtAuthGuard)
  getChatHistory(@Req() req: any) {
    return this.logsService.getChatHistory(req.user.userId);
  }

  @Get('chat')
  getSessionLogs(@Query('sessionId') sessionId: string) {
    return this.logsService.getSessionLogs(sessionId);
  }

  @Delete('chat/:sessionId')
  @UseGuards(JwtAuthGuard)
  deleteSession(@Param('sessionId') sessionId: string, @Req() req: any) {
    return this.logsService.deleteSession(sessionId, req.user.userId);
  }

  @Post('feedback')
  saveFeedback(@Body() body: { logId: number; rating: 'thumb_up' | 'thumb_down'; comment?: string }) {
    return this.logsService.saveFeedback(body.logId, body.rating, body.comment);
  }
}
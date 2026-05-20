import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LogsService } from './logs.service';

@ApiTags('Logs')
@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get('chat/history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: '내 채팅 히스토리 조회' })
  @ApiOkResponse({ description: '로그인 사용자의 채팅 세션 히스토리를 반환합니다.' })
  getChatHistory(@Req() req: any) {
    return this.logsService.getChatHistory(req.user.userId);
  }

  @Get('chat')
  @ApiOperation({ summary: '세션별 채팅 로그 조회' })
  @ApiQuery({ name: 'sessionId', description: '채팅 세션 ID' })
  @ApiOkResponse({ description: '세션에 속한 채팅 로그를 반환합니다.' })
  getSessionLogs(@Query('sessionId') sessionId: string) {
    return this.logsService.getSessionLogs(sessionId);
  }

  @Delete('chat/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: '내 채팅 세션 로그 삭제' })
  @ApiParam({ name: 'sessionId', description: '채팅 세션 ID' })
  @ApiOkResponse({ description: '삭제 결과를 반환합니다.' })
  deleteSession(@Param('sessionId') sessionId: string, @Req() req: any) {
    return this.logsService.deleteSession(sessionId, req.user.userId);
  }

  @Post('feedback')
  @ApiOperation({ summary: '답변 피드백 저장' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['logId', 'rating'],
      properties: {
        logId: { type: 'number', example: 100 },
        rating: { type: 'string', enum: ['thumb_up', 'thumb_down'], example: 'thumb_up' },
        comment: { type: 'string', example: '답변이 도움이 되었습니다.' },
      },
    },
  })
  @ApiOkResponse({ description: '피드백 저장 결과를 반환합니다.' })
  saveFeedback(@Body() body: { logId: number; rating: 'thumb_up' | 'thumb_down'; comment?: string }) {
    return this.logsService.saveFeedback(body.logId, body.rating, body.comment);
  }
}

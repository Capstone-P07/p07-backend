import { Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, JwtOptionalAuthGuard } from '../auth/jwt-auth.guard';
import { SessionsService } from './sessions.service';

@ApiTags('Sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @UseGuards(JwtOptionalAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: '채팅 세션 생성', description: 'JWT가 있으면 사용자에게 연결하고, 없으면 익명 세션을 생성합니다.' })
  @ApiOkResponse({ description: '생성된 세션 정보를 반환합니다.' })
  create(@Request() req) {
    const userId = req.user?.userId ?? null;
    return this.sessionsService.createSession(userId);
  }

  @Get(':sessionId')
  @ApiOperation({ summary: '채팅 세션 조회' })
  @ApiParam({ name: 'sessionId', description: '채팅 세션 ID' })
  @ApiOkResponse({ description: '세션 정보를 반환합니다.' })
  get(@Param('sessionId') sessionId: string) {
    return this.sessionsService.getSession(sessionId);
  }

  @Delete(':sessionId')
  @ApiOperation({ summary: '채팅 세션 삭제' })
  @ApiParam({ name: 'sessionId', description: '채팅 세션 ID' })
  @ApiOkResponse({ description: '세션 삭제 결과를 반환합니다.' })
  delete(@Param('sessionId') sessionId: string) {
    return this.sessionsService.deleteSession(sessionId);
  }

  @Patch(':sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: '익명 세션을 로그인 사용자에게 연결' })
  @ApiParam({ name: 'sessionId', description: '채팅 세션 ID' })
  @ApiOkResponse({ description: '사용자 연결 결과를 반환합니다.' })
  updateSessionUser(
    @Param('sessionId') sessionId: string,
    @Request() req,
  ) {
    const userId = req.user.userId;
    return this.sessionsService.updateSessionUser(sessionId, userId);
  }
}

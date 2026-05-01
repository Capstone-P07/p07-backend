import { Controller, Post, Get, Delete, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { JwtAuthGuard, JwtOptionalAuthGuard } from '../auth/jwt-auth.guard';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @UseGuards(JwtOptionalAuthGuard)
  create( @Request() req ) {
    const userId = req.user?.userId ?? null;
    return this.sessionsService.createSession(userId);
  }

  @Get(':sessionId')
  get(@Param('sessionId') sessionId: string) {
    return this.sessionsService.getSession(sessionId);
  }

  @Delete(':sessionId')
  delete(@Param('sessionId') sessionId: string) {
    return this.sessionsService.deleteSession(sessionId);
  }

  @Patch(':sessionId')
  @UseGuards(JwtAuthGuard) // 로그인 필수
  updateSessionUser(
    @Param('sessionId') sessionId: string,
    @Request() req,
  ) {
    const userId = req.user.userId;
    return this.sessionsService.updateSessionUser(sessionId, userId);
}
}
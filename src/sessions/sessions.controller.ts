import { Controller, Post, Get, Delete, Param, Body } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  create(@Body() dto: CreateSessionDto) {
    return this.sessionsService.createSession(dto);
  }

  @Get(':sessionId')
  get(@Param('sessionId') sessionId: string) {
    return this.sessionsService.getSession(sessionId);
  }

  @Delete(':sessionId')
  delete(@Param('sessionId') sessionId: string) {
    return this.sessionsService.deleteSession(sessionId);
  }
}
import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: '헬스 체크' })
  @ApiOkResponse({ description: '애플리케이션 기본 응답을 반환합니다.', type: String })
  getHello(): string {
    return this.appService.getHello();
  }
}

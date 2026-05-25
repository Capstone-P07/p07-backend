import { Body, Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { UpdateUnansweredDto } from './dto/update-unanswered.dto';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats/overview')
  @ApiOperation({ summary: '관리자 통계 요약 조회' })
  @ApiQuery({ name: 'period', required: false, description: '조회 기간(today, 7d, 30d, all 등)' })
  @ApiOkResponse({ description: '전체 질문 수, 만족도, 무응답 수, 색인 문서 수를 반환합니다.' })
  async getOverview(@Query('period') period?: string) {
    const data = await this.adminService.getOverview(period);
    return { success: true, data, error: null };
  }

  @Get('stats/top-queries')
  @ApiOperation({ summary: '자주 묻는 질문 Top N 조회' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'period', required: false, description: '조회 기간(today, 7d, 30d, all 등)' })
  @ApiOkResponse({ description: '질문과 빈도 목록을 반환합니다.' })
  async getTopQueries(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('period') period?: string,
  ) {
    const data = await this.adminService.getTopQueries(limit, period);
    return { success: true, data, error: null };
  }

  @Get('stats/satisfaction')
  @ApiOperation({ summary: '만족도 통계 조회' })
  @ApiQuery({ name: 'period', required: false, description: '조회 기간(today, 7d, 30d, all 등)' })
  @ApiOkResponse({ description: '만족도 요약과 일별 추이를 반환합니다.' })
  async getSatisfactionStats(@Query('period') period?: string) {
    const data = await this.adminService.getSatisfactionStats(period);
    return { success: true, data, error: null };
  }

  @Get('stats/unanswered')
  @ApiOperation({ summary: '무응답 질문 통계 조회' })
  @ApiOkResponse({ description: '무응답 비율과 사유별 통계를 반환합니다.' })
  async getUnansweredStats() {
    const data = await this.adminService.getUnansweredStats();
    return { success: true, data, error: null };
  }

  @Get('stats/documents')
  @ApiOperation({ summary: '문서별 사용 통계 조회' })
  @ApiOkResponse({ description: '문서별 조회/사용 통계를 반환합니다.' })
  async getDocumentStats() {
    const data = await this.adminService.getDocumentStats();
    return { success: true, data, error: null };
  }

  @Get('unanswered')
  @ApiOperation({ summary: '무응답 질문 목록 조회' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'status', required: false, enum: ['unresolved', 'resolved', 'dismissed'] })
  @ApiQuery({ name: 'sort', required: false, enum: ['frequency', 'latest'], example: 'frequency' })
  @ApiOkResponse({ description: '무응답 질문 목록과 페이지 정보를 반환합니다.' })
  async getUnansweredList(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('sort', new DefaultValuePipe('frequency')) sort?: 'frequency' | 'latest',
  ) {
    const data = await this.adminService.getUnansweredList(page, limit, status, sort);
    return { success: true, data, error: null };
  }

  @Patch('unanswered/:id')
  @ApiOperation({ summary: '무응답 질문 처리 상태 변경' })
  @ApiParam({ name: 'id', type: Number, description: '무응답 질문 ID' })
  @ApiBody({ type: UpdateUnansweredDto })
  @ApiOkResponse({ description: '변경된 무응답 질문 상태를 반환합니다.' })
  async updateUnansweredStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUnansweredDto,
  ) {
    const data = await this.adminService.updateUnansweredStatus(id, dto);
    return { success: true, data, error: null };
  }
  
  @Get('stats/daily')
  @ApiOperation({ summary: '일별 질문 수 추이 조회' })
  @ApiQuery({ name: 'period', required: false })
  async getDailyStats(@Query('period') period?: string) {
    const data = await this.adminService.getDailyStats(period);
    return { success: true, data, error: null };
  }
}

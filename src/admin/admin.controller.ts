import { Body, Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { UpdateUnansweredDto } from './dto/update-unanswered.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * GET /admin/stats/overview
   * FR-032: 전체 현황 (총 질문 수, 만족도, 미답변 수, 색인 문서 수)
   */
  @Get('stats/overview')
  async getOverview(
    @Query('period') period?: string
  ) {
    const data = await this.adminService.getOverview(period);
    return { success: true, data, error: null };
  }

  /**
   * GET /admin/stats/top-queries?limit=10
   * FR-006 / FR-032: 자주 묻는 질문 Top N
   */
  @Get('stats/top-queries')
  async getTopQueries(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('period') period?: string,
  ) {
    const data = await this.adminService.getTopQueries(limit, period);
    return { success: true, data, error: null };
  }

  /**
   * GET /admin/stats/satisfaction
   * FR-033: 만족도 통계 (요약 + 일별 추이)
   */
  @Get('stats/satisfaction')
  async getSatisfactionStats(
    @Query('period') period?: string,
  ) {
    const data = await this.adminService.getSatisfactionStats(period);
    return { success: true, data, error: null };
  }

  /**
   * GET /admin/stats/unanswered
   * FR-034: 미답변 질문 비율 및 사유별 통계
   */
  @Get('stats/unanswered')
  async getUnansweredStats() {
    const data = await this.adminService.getUnansweredStats();
    return { success: true, data, error: null };
  }

  /**
   * GET /admin/stats/documents
   * FR-035: 문서별 활용 통계
   */
  @Get('stats/documents')
  async getDocumentStats() {
    const data = await this.adminService.getDocumentStats();
    return { success: true, data, error: null };
  }

  /**
   * GET /admin/unanswered?page=1&limit=20&status=unresolved
   * FR-029: 미답변 질문 목록 조회
   */
  @Get('unanswered')
  async getUnansweredList(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('sort', new DefaultValuePipe('frequency')) sort?: 'frequency' | 'latest',
  ) {
    const data = await this.adminService.getUnansweredList(page, limit, status, sort);
    return { success: true, data, error: null };
  }

  /**
   * PATCH /admin/unanswered/:id
   * FR-029: 미답변 질문 처리 상태 변경
   */
  @Patch('unanswered/:id')
  async updateUnansweredStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUnansweredDto,
  ) {
    const data = await this.adminService.updateUnansweredStatus(id, dto);
    return { success: true, data, error: null };
  }
}

import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  @ApiOperation({ summary: '문서 검색', description: 'PostgreSQL FTS 기반으로 관련 문서 청크를 검색합니다.' })
  @ApiBody({ type: SearchQueryDto })
  @ApiOkResponse({ description: '검색된 문서 청크 목록을 반환합니다.' })
  async search(@Body() dto: SearchQueryDto) {
    return this.searchService.search(dto);
  }

  @Get('faq')
  @ApiOperation({ summary: 'FAQ 후보 조회', description: '자주 검색된 질문 목록을 반환합니다.' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 5 })
  @ApiOkResponse({ description: 'FAQ 후보 질문 목록을 반환합니다.' })
  async getTopFaqs(@Query('limit') limit?: string) {
    return this.searchService.getTopFaqs(limit ? parseInt(limit) : 5);
  }
}

import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  async search(@Body() dto: SearchQueryDto) {
    return this.searchService.search(dto);
  }

  @Get('faq')
  async getTopFaqs(@Query('limit') limit?: string) {
    return this.searchService.getTopFaqs(limit ? parseInt(limit) : 5);
  }
}
import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { MarkdownParserService } from './parser/markdown-parser.service';
import { ChunkerService } from './parser/chunker.service';
import { SearchController } from './search/search.controller';
import { SearchService } from './search/search.service';

@Module({
  controllers: [DocumentController, SearchController],
  providers: [DocumentService, MarkdownParserService, ChunkerService, SearchService],
  exports: [DocumentService, SearchService],
})
export class DocumentModule {}

import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { MarkdownParserService } from './parser/markdown-parser.service';
import { ChunkerService } from './parser/chunker.service';

@Module({
  controllers: [DocumentController],
  providers: [DocumentService, MarkdownParserService, ChunkerService],
  exports: [DocumentService, MarkdownParserService, ChunkerService],
})
export class DocumentModule {}

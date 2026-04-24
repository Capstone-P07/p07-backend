import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocsService } from './docs.service';
import { CreateDocumentDto } from './dto/create-document.dto';

@Controller('docs')
export class DocsController {
  constructor(private readonly docsService: DocsService) {}

  /**
   * POST /docs — multipart/form-data 로 문서 등록.
   * 필드: source ("file" | "url"), file? (Markdown), url?, title?
   */
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const name = file.originalname.toLowerCase();
        const ok =
          name.endsWith('.md') ||
          file.mimetype === 'text/markdown' ||
          file.mimetype === 'text/plain';
        if (ok) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Markdown(.md) 파일만 업로드 가능합니다.'), false);
        }
      },
    }),
  )
  async create(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateDocumentDto,
  ) {
    const data = await this.docsService.create(dto, file);
    return { success: true, data, error: null };
  }

  /**
   * GET /docs — 등록된 문서 목록 + 색인 상태.
   */
  @Get()
  async findAll() {
    const data = await this.docsService.findAll();
    return { success: true, data, error: null };
  }

  /**
   * GET /docs/:id — 문서 단건 상세 (스펙 §5.3).
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.docsService.findOne(id);
    return { success: true, data, error: null };
  }

  /**
   * GET /docs/:id/chunks — 문서의 청크 목록 (스펙 §5.4).
   */
  @Get(':id/chunks')
  async findChunks(@Param('id', ParseIntPipe) id: number) {
    const data = await this.docsService.findChunks(id);
    return { success: true, data, error: null };
  }
}

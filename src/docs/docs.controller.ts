import {
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
import { CreateDocumentDto, IndexUrlDto } from './dto/create-document.dto';

@Controller('docs')
export class DocsController {
  constructor(private readonly docsService: DocsService) {}

  /**
   * POST /docs/upload
   * PDF 또는 HTML 파일을 업로드하여 색인합니다.
   * Content-Type: multipart/form-data
   * 필드: file (파일), title? (제목), category? (카테고리)
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024 }, // 최대 20MB
      fileFilter: (_, file, cb) => {
        const allowed = ['application/pdf', 'text/html'];
        if (allowed.includes(file.mimetype) || file.originalname.endsWith('.html')) {
          cb(null, true);
        } else {
          cb(new Error('PDF 또는 HTML 파일만 업로드 가능합니다.'), false);
        }
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateDocumentDto,
  ) {
    const doc = await this.docsService.indexFromFile(file, dto);
    return { success: true, data: doc, error: null };
  }

  /**
   * POST /docs/url
   * URL을 등록하여 해당 페이지를 색인합니다.
   * Body: { url: string, title?: string, category?: string }
   */
  @Post('url')
  async indexUrl(@Body() dto: IndexUrlDto) {
    const doc = await this.docsService.indexFromUrl(dto);
    return { success: true, data: doc, error: null };
  }

  /**
   * GET /docs
   * 색인된 문서 목록을 반환합니다.
   */
  @Get()
  async findAll() {
    const docs = await this.docsService.findAll();
    return { success: true, data: docs, error: null };
  }

  /**
   * GET /docs/:id
   * 특정 문서의 상세 정보를 반환합니다.
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const doc = await this.docsService.findOne(id);
    return { success: true, data: doc, error: null };
  }

  /**
   * GET /docs/:id/chunks
   * 특정 문서의 청크(분할된 텍스트) 목록을 반환합니다.
   */
  @Get(':id/chunks')
  async getChunks(@Param('id', ParseIntPipe) id: number) {
    const chunks = await this.docsService.getChunks(id);
    return { success: true, data: chunks, error: null };
  }
}

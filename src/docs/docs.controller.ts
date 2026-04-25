import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocsService } from './docs.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

// POST /docs 와 PUT /docs/:id 가 공유하는 Markdown 업로드 정책
const MARKDOWN_UPLOAD_OPTIONS = {
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
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
};

@Controller('docs')
export class DocsController {
  constructor(private readonly docsService: DocsService) {}

  /**
   * POST /docs — multipart/form-data 로 문서 등록.
   * 필드: source ("file" | "url"), file? (Markdown), url?, title?
   */
  @Post()
  @UseInterceptors(FileInterceptor('file', MARKDOWN_UPLOAD_OPTIONS))
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
   * `?includeFts=true` 로 mecab-ko 토큰화 결과(`ftsVector`) 도 포함 (디버깅용).
   */
  @Get(':id/chunks')
  async findChunks(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeFts', new DefaultValuePipe(false), ParseBoolPipe) includeFts: boolean,
  ) {
    const data = await this.docsService.findChunks(id, { includeFts });
    return { success: true, data, error: null };
  }

  /**
   * PUT /docs/:id — multipart/form-data 로 문서 수정.
   * file 동봉 시 청크 전부 교체 + 재색인. 미동봉 시 title 만 갱신.
   */
  @Put(':id')
  @UseInterceptors(FileInterceptor('file', MARKDOWN_UPLOAD_OPTIONS))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UpdateDocumentDto,
  ) {
    const data = await this.docsService.update(id, dto, file);
    return { success: true, data, error: null };
  }

  /**
   * DELETE /docs/:id — 문서 + 관련 청크 삭제 (CASCADE).
   */
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const data = await this.docsService.remove(id);
    return { success: true, data, error: null };
  }

  /**
   * POST /docs/:id/reindex — 수동 재색인 (FTS 트리거 재실행).
   */
  @Post(':id/reindex')
  async reindex(@Param('id', ParseIntPipe) id: number) {
    const data = await this.docsService.reindex(id);
    return { success: true, data, error: null };
  }
}

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
import {
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { DocsService } from './docs.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

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

const DOCUMENT_FORM_SCHEMA = {
  schema: {
    type: 'object',
    required: ['source', 'category', 'file'],
    properties: {
      source: {
        type: 'string',
        enum: ['file'],
        description: 'Markdown 파일 업로드만 지원합니다.',
        example: 'file',
      },
      category: {
        type: 'string',
        description: '문서 카테고리입니다.',
        example: '작업 관리',
      },
      title: {
        type: 'string',
        description: '문서 제목입니다.',
        example: 'Riido 시작하기',
      },
      url: {
        type: 'string',
        description: '문서 원본 근거 링크입니다. https://docs.riido.io/* 만 허용됩니다.',
        example: 'https://docs.riido.io/guide/getting-started',
      },
      file: {
        type: 'string',
        format: 'binary',
        description: '업로드할 Markdown(.md) 파일입니다.',
      },
    },
  },
};

const DOCUMENT_UPDATE_FORM_SCHEMA = {
  schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: '변경할 문서 제목입니다.',
        example: 'Riido 시작하기 개정판',
      },
      category: {
        type: 'string',
        description: '변경할 문서 카테고리입니다.',
        example: '작업 관리',
      },
      markdown: {
        type: 'string',
        description: '교체할 문서 본문 Markdown입니다. file과 함께 전달되면 markdown이 우선합니다.',
        example: '# Riido 시작하기\n\n## 개요\n\nRiido 서비스 가이드 본문입니다.',
      },
      file: {
        type: 'string',
        format: 'binary',
        description: '교체할 Markdown(.md) 파일입니다.',
      },
    },
  },
};

@ApiTags('Docs')
@Controller('docs')
export class DocsController {
  constructor(private readonly docsService: DocsService) {}

  @Post()
  @ApiOperation({ summary: '문서 등록', description: 'Markdown 파일을 등록하고 선택한 원본 URL을 근거 링크로 저장합니다.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody(DOCUMENT_FORM_SCHEMA)
  @ApiOkResponse({ description: '등록된 문서 ID와 색인 상태를 반환합니다.' })
  @UseInterceptors(FileInterceptor('file', MARKDOWN_UPLOAD_OPTIONS))
  async create(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateDocumentDto,
  ) {
    const data = await this.docsService.create(dto, file);
    return { success: true, data, error: null };
  }

  @Get()
  @ApiOperation({ summary: '문서 목록 조회' })
  @ApiOkResponse({ description: '등록된 문서 목록과 색인 상태를 반환합니다.' })
  async findAll() {
    const data = await this.docsService.findAll();
    return { success: true, data, error: null };
  }

  @Get(':id')
  @ApiOperation({ summary: '문서 상세 조회' })
  @ApiParam({ name: 'id', type: Number, description: '문서 ID' })
  @ApiOkResponse({ description: '문서 상세 정보를 반환합니다.' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.docsService.findOne(id);
    return { success: true, data, error: null };
  }

  @Get(':id/chunks')
  @ApiOperation({ summary: '문서 청크 목록 조회' })
  @ApiParam({ name: 'id', type: Number, description: '문서 ID' })
  @ApiQuery({ name: 'includeFts', required: false, type: Boolean, description: 'FTS vector 디버그 정보를 포함합니다.' })
  @ApiOkResponse({ description: '문서에 속한 청크 목록을 반환합니다.' })
  async findChunks(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeFts', new DefaultValuePipe(false), ParseBoolPipe) includeFts: boolean,
  ) {
    const data = await this.docsService.findChunks(id, { includeFts });
    return { success: true, data, error: null };
  }

  @Put(':id')
  @ApiOperation({ summary: '문서 수정', description: '문서 제목을 수정하거나 Markdown 파일을 교체해 재색인합니다.' })
  @ApiParam({ name: 'id', type: Number, description: '문서 ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody(DOCUMENT_UPDATE_FORM_SCHEMA)
  @ApiOkResponse({ description: '수정된 문서 ID와 색인 상태를 반환합니다.' })
  @UseInterceptors(FileInterceptor('file', MARKDOWN_UPLOAD_OPTIONS))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UpdateDocumentDto,
  ) {
    const data = await this.docsService.update(id, dto, file);
    return { success: true, data, error: null };
  }

  @Delete(':id')
  @ApiOperation({ summary: '문서 삭제' })
  @ApiParam({ name: 'id', type: Number, description: '문서 ID' })
  @ApiOkResponse({ description: '삭제된 문서와 청크 수를 반환합니다.' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    const data = await this.docsService.remove(id);
    return { success: true, data, error: null };
  }

  @Post(':id/reindex')
  @ApiOperation({ summary: '문서 재색인' })
  @ApiParam({ name: 'id', type: Number, description: '문서 ID' })
  @ApiOkResponse({ description: '재색인 상태를 반환합니다.' })
  async reindex(@Param('id', ParseIntPipe) id: number) {
    const data = await this.docsService.reindex(id);
    return { success: true, data, error: null };
  }
}

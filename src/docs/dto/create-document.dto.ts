import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateDocumentDto {
  @ApiProperty({
    enum: ['file'],
    description: '문서 등록 방식입니다. Markdown 파일 업로드만 지원합니다.',
    example: 'file',
  })
  @IsIn(['file'], { message: 'source는 file이어야 합니다.' })
  source: 'file' | 'url';

  @ApiProperty({
    description: '문서 카테고리입니다.',
    example: '작업 관리',
    maxLength: 20,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  category: string;

  @ApiPropertyOptional({
    description: '문서 원본 근거 링크입니다. https://docs.riido.io/* 만 허용됩니다.',
    example: 'https://docs.riido.io/guide/getting-started',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  url?: string;

  @ApiPropertyOptional({
    description: '문서 제목입니다. 생략하면 파일명 또는 URL에서 추론합니다.',
    example: 'Riido 시작하기',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;
}

export interface CreateDocumentResponse {
  docId: number;
  title: string;
  category: string;
  indexStatus: 'pending' | 'indexing' | 'indexed' | 'failed';
  message: string;
}

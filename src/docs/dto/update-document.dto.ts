import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateDocumentDto {
  @ApiPropertyOptional({
    description: '변경할 문서 제목입니다.',
    example: 'Riido 시작하기 개정판',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: '변경할 문서 카테고리입니다.',
    example: '작업 관리',
    maxLength: 20,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  category?: string;

  @ApiPropertyOptional({
    description: '교체할 문서 본문 Markdown입니다. 파일과 함께 전달되면 Markdown 본문이 우선합니다.',
    example: '# Riido 시작하기\n\n## 개요\n\nRiido 서비스 가이드 본문입니다.',
  })
  @IsOptional()
  @IsString()
  markdown?: string;
}

export interface UpdateDocumentResponse {
  docId: number;
  title: string;
  indexStatus: 'pending' | 'indexing' | 'indexed' | 'failed';
  message: string;
}

export interface DeleteDocumentResponse {
  docId: number;
  deletedChunks: number;
  message: string;
}

export interface ReindexDocumentResponse {
  docId: number;
  indexStatus: 'pending' | 'indexing' | 'indexed' | 'failed';
}

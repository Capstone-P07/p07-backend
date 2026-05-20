import { ApiPropertyOptional } from '@nestjs/swagger';
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

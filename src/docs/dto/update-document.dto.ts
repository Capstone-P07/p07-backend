import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateDocumentDto {
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

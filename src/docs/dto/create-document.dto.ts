import { IsIn, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateDocumentDto {
  @IsIn(['file', 'url'], { message: 'source는 file 또는 url 이어야 합니다.' })
  source: 'file' | 'url';

  @IsOptional()
  @IsString()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  url?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;
}

export interface CreateDocumentResponse {
  docId: number;
  title: string;
  indexStatus: 'pending' | 'indexing' | 'indexed' | 'failed';
  message: string;
}

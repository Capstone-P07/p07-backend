import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateDocumentDto {
  @ApiProperty({
    enum: ['file', 'url'],
    description: '문서 등록 방식입니다. Markdown 파일 업로드는 file, Riido 문서 URL 등록은 url을 사용합니다.',
    example: 'file',
  })
  @IsIn(['file', 'url'], { message: 'source는 file 또는 url이어야 합니다.' })
  source: 'file' | 'url';

  @ApiPropertyOptional({
    description: 'source=url일 때 등록할 Riido 문서 URL입니다. https://docs.riido.io/* 만 허용됩니다.',
    example: 'https://docs.riido.io/guide/getting-started',
  })
  @IsOptional()
  @IsString()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
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
  indexStatus: 'pending' | 'indexing' | 'indexed' | 'failed';
  message: string;
}

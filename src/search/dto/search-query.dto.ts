import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class SearchQueryDto {
  @ApiProperty({ description: '검색할 사용자 질문 또는 키워드입니다.', example: '프로젝트 생성 방법' })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiPropertyOptional({ description: '검색 로그를 연결할 세션 ID입니다.', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiPropertyOptional({ description: '반환할 검색 결과 개수입니다.', example: 5, default: 5 })
  @IsOptional()
  topK?: number = 5;
}

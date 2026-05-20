import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional } from 'class-validator';

export type UnansweredStatus = 'resolved' | 'dismissed' | 'unresolved';

export class UpdateUnansweredDto {
  @ApiProperty({
    enum: ['resolved', 'dismissed', 'unresolved'],
    description: '무응답 질문 처리 상태입니다.',
    example: 'resolved',
  })
  @IsIn(['resolved', 'dismissed', 'unresolved'])
  status: UnansweredStatus;

  @ApiPropertyOptional({
    description: 'resolved 처리 시 연결할 문서 ID입니다. dismissed/unresolved에서는 null 또는 생략합니다.',
    example: 12,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  resolvedBy?: number | null;
}

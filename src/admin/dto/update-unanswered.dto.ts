import { IsIn, IsInt, IsOptional } from 'class-validator';

export type UnansweredStatus = 'resolved' | 'dismissed' | 'unresolved';

export class UpdateUnansweredDto {
  @IsIn(['resolved', 'dismissed', 'unresolved'])
  status: UnansweredStatus;

  @IsOptional()
  @IsInt()
  resolvedBy?: number | null;
}

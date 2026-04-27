import { IsOptional, IsUUID } from 'class-validator';

export class CreateSessionDto {
  @IsOptional()
  @IsUUID()
  userId?: string; // 로그인 사용자면 전달
}
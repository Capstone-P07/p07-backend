import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: '현재 비밀번호입니다.', example: 'oldPassword123' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ description: '새 비밀번호입니다. 최소 6자입니다.', example: 'newPassword123', minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

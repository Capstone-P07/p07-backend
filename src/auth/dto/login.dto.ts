import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: '로그인 이메일 주소입니다.', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '로그인 비밀번호입니다.', example: 'password123' })
  @IsString()
  password: string;
}

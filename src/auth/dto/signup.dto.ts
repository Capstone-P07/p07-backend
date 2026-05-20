import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class SignupDto {
  @ApiProperty({ description: '가입할 이메일 주소입니다.', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '비밀번호입니다. 최소 6자입니다.', example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}

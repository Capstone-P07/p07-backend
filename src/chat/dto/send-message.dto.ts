import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ description: '챗봇에 전달할 사용자 질문입니다.', example: 'Riido에서 프로젝트는 어떻게 생성하나요?' })
  @IsString()
  @IsNotEmpty()
  question: string;
}

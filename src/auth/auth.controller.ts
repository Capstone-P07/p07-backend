import { Body, Controller, Delete, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: '회원가입' })
  @ApiBody({ type: SignupDto })
  @ApiOkResponse({ description: '가입된 사용자 정보를 반환합니다.' })
  async signup(@Body() dto: SignupDto) {
    const data = await this.authService.signup(dto);
    return { success: true, data, error: null };
  }

  @Post('login')
  @ApiOperation({ summary: '로그인' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: 'JWT accessToken을 반환합니다.' })
  async login(@Body() dto: LoginDto) {
    const data = await this.authService.login(dto);
    return { success: true, data, error: null };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: '로그아웃' })
  @ApiOkResponse({ description: '로그아웃 메시지를 반환합니다.' })
  async logout() {
    return { success: true, data: { message: '로그아웃 되었습니다.' }, error: null };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: '내 정보 조회' })
  @ApiOkResponse({ description: '현재 인증된 사용자 정보를 반환합니다.' })
  async getMe(@Req() req) {
    const data = await this.authService.getMe(req.user.userId);
    return { success: true, data, error: null };
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: '회원 탈퇴' })
  @ApiOkResponse({ description: '계정 삭제 결과를 반환합니다.' })
  async deleteMe(@Req() req) {
    const data = await this.authService.deleteMe(req.user.userId);
    return { success: true, data, error: null };
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: '비밀번호 변경' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({ description: '비밀번호 변경 결과를 반환합니다.' })
  async changePassword(@Req() req, @Body() dto: ChangePasswordDto) {
    const data = await this.authService.changePassword(req.user.userId, dto.currentPassword, dto.newPassword);
    return { success: true, data, error: null };
  }
}

import { Controller, Post, Get, Delete, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    const data = await this.authService.signup(dto);
    return { success: true, data, error: null };
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const data = await this.authService.login(dto);
    return { success: true, data, error: null };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout() {
    return { success: true, data: { message: '로그아웃 되었습니다.' }, error: null };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req) {
    const data = await this.authService.getMe(req.user.userId);
    return { success: true, data, error: null };
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  async deleteMe(@Req() req) {
    const data = await this.authService.deleteMe(req.user.userId);
    return { success: true, data, error: null };
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@Req() req, @Body() dto: ChangePasswordDto) {
    const data = await this.authService.changePassword(req.user.userId, dto.currentPassword, dto.newPassword);
    return { success: true, data, error: null };
  }
}
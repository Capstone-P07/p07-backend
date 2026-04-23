import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const exists = await this.userRepository.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException({ code: 'CONFLICT', message: '이미 사용 중인 이메일입니다.' });

    const pwd_hash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({ email: dto.email, pwd_hash });
    const saved = await this.userRepository.save(user);

    return {
      userId: saved.id,
      email: saved.email,
      createdAt: saved.created_at,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '이메일 또는 비밀번호가 올바르지 않습니다.' });

    const isMatch = await bcrypt.compare(dto.password, user.pwd_hash);
    if (!isMatch) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '이메일 또는 비밀번호가 올바르지 않습니다.' });

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 3600,
    };
  }

  async getMe(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '사용자를 찾을 수 없습니다.' });

    return {
      userId: user.id,
      username: user.name,
      email: user.email,
    };
  }

  async deleteMe(userId: string) {
    await this.userRepository.delete({ id: userId });
    return { message: '회원탈퇴가 완료되었습니다.' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '사용자를 찾을 수 없습니다.' });

    const isMatch = await bcrypt.compare(currentPassword, user.pwd_hash);
    if (!isMatch) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '현재 비밀번호가 올바르지 않습니다.' });

    user.pwd_hash = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);

    return { message: '비밀번호가 변경되었습니다.' };
  }
}
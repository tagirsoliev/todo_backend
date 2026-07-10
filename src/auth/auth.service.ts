import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { config } from '../config';
import { UsersService } from '../users/users.service';
import type { TelegramAuthDto } from './dto/telegram-auth.dto';
import { verifyTelegramAuth } from './telegram-auth.util';
import type { JwtPayload } from './types';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async loginWithTelegram(dto: TelegramAuthDto) {
    if (!verifyTelegramAuth(dto, config.botToken)) {
      throw new UnauthorizedException(
        'Неверная или устаревшая подпись Telegram',
      );
    }

    const user = await this.usersService.getByTelegramId(dto.id);
    if (!user) {
      throw new UnauthorizedException('Пользователь не в белом списке');
    }

    const payload: JwtPayload = { sub: user.telegramId, isAdmin: user.isAdmin };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        telegramId: user.telegramId,
        name: user.name,
        isAdmin: user.isAdmin,
      },
    };
  }
}

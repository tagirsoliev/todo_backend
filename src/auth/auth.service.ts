import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { config } from '../config';
import { UsersService } from '../users/users.service';
import type { TelegramLoginDto } from './dto/telegram-login.dto';
import { verifyIdToken } from './telegram-auth.util';
import type { JwtPayload } from './types';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async loginWithTelegram(dto: TelegramLoginDto) {
    let telegramId: number;
    try {
      const claims = await verifyIdToken(dto.idToken, config.telegramClientId);
      telegramId = claims.id;
    } catch {
      // Any failure in verification is an auth failure — do not leak the
      // underlying reason (bad signature, wrong audience, expired, etc.).
      throw new UnauthorizedException(
        'Не удалось подтвердить вход через Telegram',
      );
    }

    const user = await this.usersService.getByTelegramId(telegramId);
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

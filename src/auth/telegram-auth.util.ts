import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { TelegramAuthDto } from './dto/telegram-auth.dto';

// A Telegram Login Widget payload is considered stale (and rejected) once
// older than this, to limit replay of a captured/leaked payload.
const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;

// Verifies the HMAC-SHA256 signature of a Telegram Login Widget payload
// against the bot token, per https://core.telegram.org/widgets/login#checking-authorization.
// Returns true only if the hash matches AND the payload is fresh.
export function verifyTelegramAuth(
  payload: TelegramAuthDto,
  botToken: string,
): boolean {
  const { hash, ...fields } = payload;

  const dataCheckString = Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('\n');

  const secretKey = createHash('sha256').update(botToken).digest();
  const computedHash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  const computedBuf = Buffer.from(computedHash, 'hex');
  const providedBuf = Buffer.from(hash, 'hex');
  if (
    computedBuf.length !== providedBuf.length ||
    !timingSafeEqual(computedBuf, providedBuf)
  ) {
    return false;
  }

  const ageSeconds = Date.now() / 1000 - payload.auth_date;
  return ageSeconds >= 0 && ageSeconds <= MAX_AUTH_AGE_SECONDS;
}

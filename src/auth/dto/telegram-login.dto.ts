import { IsString, MinLength } from 'class-validator';

// Sent by the frontend after the Telegram Login widget returns an `id_token`
// (scope: openid profile). The backend verifies the token's RS256 signature
// against Telegram's JWKS and matches the user against the whitelist — no
// authorization-code exchange, so no client secret is involved here.
export class TelegramLoginDto {
  @IsString()
  @MinLength(1)
  idToken!: string;
}

import { IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';

// Payload produced by the Telegram Login Widget. Field names/casing are
// fixed by Telegram's protocol (see https://core.telegram.org/widgets/login).
export class TelegramAuthDto {
  @IsInt()
  id!: number;

  @IsString()
  first_name!: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsUrl()
  photo_url?: string;

  @IsInt()
  @Min(0)
  auth_date!: number;

  @IsString()
  hash!: string;
}

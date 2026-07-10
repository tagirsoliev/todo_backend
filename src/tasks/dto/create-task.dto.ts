import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text!: string;

  // Recipient's telegram_id. Omit to assign the task to yourself.
  @IsOptional()
  @IsInt()
  @IsPositive()
  ownerTelegramId?: number;
}

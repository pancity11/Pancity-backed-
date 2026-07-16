import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  // Accepts either email or phone number in this one field.
  @IsString()
  identifier: string;

  @IsString()
  @MinLength(6)
  password: string;
}

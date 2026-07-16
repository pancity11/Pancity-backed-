import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class PurchaseDto {
  @IsIn(['airtime', 'data', 'cable', 'electricity', 'exam-pin', 'airtime2cash'])
  type: string;

  @IsString()
  network: string;

  @IsString()
  target: string;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsString()
  planName?: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  payoutBankName?: string;

  @IsOptional()
  @IsString()
  payoutAccountNumber?: string;

  // Either a PIN, or a short-lived quickAuthToken from a prior successful
  // PIN verification (used for fingerprint-authorized purchases).
  @IsOptional()
  @IsString()
  pin?: string;

  @IsOptional()
  @IsString()
  quickAuthToken?: string;
}

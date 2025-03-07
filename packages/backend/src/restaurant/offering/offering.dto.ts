import { IsOptional, IsString } from 'class-validator';

export class OfferingCreateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  price?: string;
}

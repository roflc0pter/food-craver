import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { OfferingDto } from './offering/offering.dto';
import { MenuFileDto } from './menu-file/menu-file.dto';

export class CreateRestaurantDto {
  @ApiProperty({
    example: ['https://example.com/menu'],
    description: 'List of menu links for the restaurant',
  })
  @IsArray()
  @IsString({ each: true })
  links: string[];
}

export class ScraperResultDto {
  @ApiProperty({ example: 'uuid-1234', description: 'The unique job ID' })
  @IsUUID()
  jobId: string;

  @ApiProperty({ description: 'Extracted data' })
  data: string[];

  @ApiProperty({
    enum: ['htmlExtractor', 'apiExtractor', 'fileExtractor'],
    description: 'The extraction method used',
  })
  method: 'htmlExtractor' | 'apiExtractor' | 'fileExtractor';

  @ApiProperty({
    example: 'Timeout error',
    description: 'Error message if extraction fails',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  error?: string;
}

export class RestaurantResponseDto {
  @ApiProperty({ example: 1, description: 'The unique ID of the restaurant' })
  @IsNumber()
  restaurantId: number;

  @ApiProperty({
    example: 'Best Pizzeria',
    description: 'The name of the restaurant',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'https://bestpizzeria.com',
    description: 'The restaurant website URL',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiProperty({
    description: 'List of offerings available at the restaurant',
    type: [OfferingDto],
    nullable: true,
  })
  @IsOptional()
  @IsArray()
  offerings?: OfferingDto[];

  @ApiProperty({
    description: 'List of menu files associated with the restaurant',
    type: [MenuFileDto],
    nullable: true,
  })
  @IsOptional()
  @IsArray()
  files?: MenuFileDto[];
}

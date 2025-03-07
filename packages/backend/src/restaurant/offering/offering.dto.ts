import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class OfferingCreateDto {
  @ApiProperty({
    example: 'Pizza Margherita',
    description: 'Name of the offering',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'Traditional Italian pizza with tomato and cheese',
    description: 'Description of the offering',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: '12.99',
    description: 'Price of the offering',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  price?: string;
}

export class OfferingDto {
  @ApiProperty({ example: 1, description: 'The unique ID of the menu item' })
  @IsNumber()
  menuItemId: number;

  @ApiProperty({
    example: 'Pizza Margherita',
    description: 'The name of the offering',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'Traditional Italian pizza with tomato and cheese',
    description: 'Description of the offering',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: '12.99',
    description: 'Price of the offering',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  price?: string;
}

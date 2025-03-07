import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsUUID } from 'class-validator';

export class MenuFileDto {
  @ApiProperty({ example: 'uuid-1234', description: 'The unique file ID' })
  @IsUUID()
  menuFileId: string;

  @ApiProperty({ example: 1, description: 'The associated restaurant ID' })
  @IsNumber()
  restaurantId: number;

  @ApiProperty({
    example: 'image/png',
    description: 'File type (image, pdf, etc.)',
  })
  @IsString()
  type: string;

  @ApiProperty({
    example: '/uploads/menu-1234.pdf',
    description: 'Path to the stored file',
  })
  @IsString()
  filePath: string;
}

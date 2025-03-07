import { ApiProperty } from '@nestjs/swagger';

export class CreateJobDto {
  @ApiProperty({
    example: 'https://example.com',
    description: 'The URL of the page to be crawled',
  })
  url: string;
}

export class JobEmitDto {
  @ApiProperty({
    example: 'https://example.com',
    description: 'The URL of the page',
  })
  url: string;

  @ApiProperty({ example: 'abc123', description: 'The ID of the job' })
  jobId: string;

  @ApiProperty({
    enum: ['page', 'subpage'],
    description: 'The type of the job',
  })
  type: 'page' | 'subpage';
}

export class JobResponseDto {
  @ApiProperty({
    example: 'uuid-1234',
    description: 'The unique ID of the job',
  })
  jobId: string;

  @ApiProperty({
    example: 1,
    description: 'The ID of the associated restaurant',
  })
  restaurantId: number;

  @ApiProperty({
    example: 'queued',
    enum: ['queued', 'processed', 'failed'],
    description: 'The status of the job',
  })
  status: 'queued' | 'processed' | 'failed';

  @ApiProperty({
    example: 'Timeout error',
    description: 'Error message if the job fails',
    nullable: true,
  })
  error?: string;
}

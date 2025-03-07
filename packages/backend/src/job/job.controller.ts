import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JobService } from './job.service';
import { CreateJobDto, JobResponseDto } from './job.dto';

@ApiTags('Jobs')
@Controller('jobs')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new crawling job' })
  @ApiResponse({
    status: 201,
    description: 'Job successfully created.',
    type: JobResponseDto,
  })
  async createJob(@Body() dto: CreateJobDto) {
    return this.jobService.createJob(dto);
  }

  @Get(':jobId')
  @ApiOperation({ summary: 'Retrieve a job by ID' })
  @ApiResponse({
    status: 200,
    description: 'Job successfully retrieved.',
    type: JobResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Job not found.' })
  async getJob(@Param('jobId') jobId: string) {
    return this.jobService.getJob(jobId);
  }
}

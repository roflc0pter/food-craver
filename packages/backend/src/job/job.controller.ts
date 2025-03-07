import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { JobService } from './job.service';
import { CreateJobDto } from './job.dto';

@Controller('jobs')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Post()
  async createJob(@Body() dto: CreateJobDto) {
    return this.jobService.createJob(dto);
  }

  @Get(':jobId')
  async getJob(@Param('jobId') jobId: string) {
    return this.jobService.getJob(jobId);
  }
}

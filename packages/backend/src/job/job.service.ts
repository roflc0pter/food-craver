import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/sequelize';
import { RestaurantModel } from 'src/restaurant/restaurant.model';
import { CreateJobDto, JobEmitDto } from './job.dto';
import { JobModel } from './job.model';

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name);

  constructor(
    @InjectModel(JobModel)
    private jobModel: typeof JobModel,

    @InjectModel(RestaurantModel)
    private restaurantModel: typeof RestaurantModel,

    @Inject('RABBITMQ_SERVICE') private scraperQueue: ClientProxy,
  ) {}

  async createJob(dto: CreateJobDto) {
    const transaction = await this.jobModel.sequelize?.transaction();

    try {
      const restaurant = await this.restaurantModel.create(
        { url: dto.url },
        { transaction },
      );

      const job = await this.jobModel.create(
        {
          ...dto,
          status: 'queued',
          restaurantId: restaurant.restaurantId,
        },
        { transaction },
      );
      await transaction?.commit();

      this.scraperQueue.emit<JobEmitDto>('page.added', {
        url: dto.url,
        jobId: job.jobId,
      });
      return job;
    } catch (error) {
      this.logger.error('Job create failed', error);
      await transaction?.rollback();
    }
  }

  async getJob(jobId: string) {
    return this.jobModel.findByPk(jobId);
  }
}

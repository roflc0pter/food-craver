import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction } from 'sequelize';
import { JobModel } from 'src/job/job.model';
import { MenuFileModel } from './menu-file/menu-file.model';
import { OfferingModel } from './offering/offering.model';
import { ScraperResultDto } from './restaurant.dto';
import { RestaurantModel } from './restaurant.model';

@Injectable()
export class RestaurantService {
  private readonly logger = new Logger(RestaurantService.name);

  constructor(
    @InjectModel(RestaurantModel)
    private restaurantModel: typeof RestaurantModel,

    @InjectModel(OfferingModel)
    private offeringModel: typeof OfferingModel,

    @InjectModel(MenuFileModel)
    private menuFileModel: typeof MenuFileModel,

    @InjectModel(JobModel)
    private jobModel: typeof JobModel,
  ) {}

  async createRestaurant(name: string) {
    return this.restaurantModel.create({ name, url: 'tada' });
  }

  async handlePageProcessed(dto: ScraperResultDto) {
    const transaction = await this.jobModel.sequelize?.transaction();
    try {
      const job = await this.jobModel.findByPk(dto.jobId);
      if (!job) {
        this.logger.error(`Job not found. ${dto.jobId}`);
        throw new NotFoundException();
      }

      job.status = 'processed';
      await job.save({ transaction });

      switch (dto.method) {
        case 'apiExtractor':
        case 'htmlExtractor': {
          await this.addOffering(job.restaurantId, dto.data, transaction);
          break;
        }
        case 'fileExtractor': {
          await this.addFiles(job.restaurantId, dto.data, transaction);
          break;
        }
        default: {
          this.logger.error(`Method not supported`);
          throw new NotFoundException();
        }
      }
      await transaction?.commit();
      this.logger.debug(`Job ID: ${dto.jobId} processing finished`);
    } catch (error) {
      await transaction?.rollback();
      this.logger.error(`Job ID: ${dto.jobId} processing failed`, error);
    }
  }

  async handlePageFailed(dto: ScraperResultDto) {
    await this.jobModel.update(
      { status: 'failed', error: dto.error },
      { where: { jobId: dto.jobId } },
    );
    this.logger.debug(`Job ID: ${dto.jobId} failed`);
  }

  async getRestaurant(id: string) {
    return this.restaurantModel.findByPk(id, {
      include: ['offerings', 'files'],
    });
  }

  private async addOffering(
    restaurantId: number,
    dto: string[],
    transaction?: Transaction,
  ) {
    const payload = dto.map((item) => ({
      name: item,
      restaurantId,
    }));

    return this.offeringModel.bulkCreate(payload, { transaction });
  }

  private async addFiles(
    restaurantId: number,
    dto: string[],
    transaction?: Transaction,
  ) {
    const payload = dto.map((filePath) => {
      // Dateityp anhand der Endung bestimmen
      const extension = filePath.split('.').pop()?.toLowerCase();
      let type = 'unknown';

      if (extension) {
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) {
          type = 'image';
        } else if (['pdf'].includes(extension)) {
          type = 'pdf';
        }
      }

      return {
        filePath,
        type,
        restaurantId,
      };
    });

    return this.menuFileModel.bulkCreate(payload, { transaction });
  }
}

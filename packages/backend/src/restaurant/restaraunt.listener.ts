import { Controller, Logger } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { ScraperResultDto } from './restaurant.dto';
import { RestaurantService } from './restaurant.service';

@Controller()
export class RestaurantEventController {
  private readonly logger = new Logger(RestaurantEventController.name);

  constructor(private readonly restaurantService: RestaurantService) {}

  @EventPattern('page.processed')
  async handlePageProcessed(dto: ScraperResultDto) {
    this.logger.log(`Received event for processed restaurant: ${dto.jobId}`);
    return this.restaurantService.handlePageProcessed(dto);
  }

  @EventPattern('page.failed')
  async handlePageFailed(dto: ScraperResultDto) {
    this.logger.log(`Received event for failed restaurant: ${dto.jobId}`);
    return this.restaurantService.handlePageFailed(dto);
  }
}

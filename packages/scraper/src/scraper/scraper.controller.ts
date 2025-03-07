import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ScraperJobDto } from './scraper.dto';
import { ScraperService } from './scraper.service';

@Controller()
export class ScraperController {
  private readonly logger = new Logger(ScraperController.name);

  constructor(private readonly scraperService: ScraperService) {}

  @EventPattern('page.added')
  async handleScrapingJob(@Payload() data: ScraperJobDto) {
    this.logger.debug(`Received RabbitMQ message: ${JSON.stringify(data)}`);

    if (!data?.url) {
      this.logger.error('Received invalid data from RabbitMQ');
      return;
    }

    await this.scraperService.extractMenu(data);
  }
}

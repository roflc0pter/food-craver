import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @Inject('RABBITMQ_SERVICE') private readonly rabbitClient: ClientProxy,
  ) {}

  getHello() {
    const urlToScrape = 'https://example.com';

    this.logger.debug(`Sending scraping job for URL: ${urlToScrape}`);
    const urls = [
      // 'https://roemerpilsbrunnen.de/getraenke/#',
      'https://roemerpilsbrunnen.de/speisen/',
      // 'https://schwarzerstern.com/speisekarte/',
      // 'https://weidenhof-frankfurt.de/menus-der-woche/',
      // 'https://bonvivant-Wm.de/#speisekarte',
      // 'https://apfelwein-dax.de/Speisekarte',
    ];

    urls.forEach((url) =>
      this.rabbitClient.emit('page.added', {
        url: url,
      }),
    );
  }
}

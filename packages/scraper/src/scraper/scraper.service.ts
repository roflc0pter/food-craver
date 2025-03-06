import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { Cache } from 'cache-manager';
import { Page } from 'puppeteer';
import { BrowserService } from 'src/browser/browser.service';
import { FileExtractorService } from './file-extractor.service';
import { HtmlExtractorService } from './html-extractor.service';
import { LinkExtractorService } from './link-extractor.service';
import {
  CachedScrapingDto,
  ScraperJobDto,
  ScrapingResultDto,
} from './scraper.dto';

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private readonly scraperPageQueue: ClientProxy;

  constructor(
    private readonly browserService: BrowserService,
    private readonly htmlExtractor: HtmlExtractorService,
    private readonly linkExtractor: LinkExtractorService,
    private readonly fileExtractor: FileExtractorService,
    private readonly configService: ConfigService,
    @Inject('CACHE_MANAGER') private readonly cacheManager: Cache,
  ) {
    const host = this.configService.getOrThrow<string>('RABBITMQ_HOST');
    const port = this.configService.getOrThrow<string>('RABBITMQ_PORT');
    const user = this.configService.getOrThrow<string>('RABBITMQ_USER');
    const pw = this.configService.getOrThrow<string>('RABBITMQ_PW');

    this.scraperPageQueue = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [`amqp://${user}:${pw}@${host}:${port}`],
        queue: 'scraper.page.queue',
        queueOptions: { durable: true },
      },
    });
  }

  async extractMenu(payload: ScraperJobDto) {
    this.logger.debug(`Starting extraction for URL: ${payload.url}`);
    await this.browserService.launchBrowser();
    const page = await this.browserService.goto(payload.url);
    const hostname = new URL(payload.url).hostname;

    const cachedResult = await this.cacheManager.get<CachedScrapingDto>(
      `scraper:${hostname}`,
    );

    let result: ScrapingResultDto | null = null;
    if (cachedResult) {
      this.logger.debug(
        `Using cached method: ${cachedResult.method} for ${hostname}`,
      );
      result = await this.executeExtractionMethod(
        page,
        payload,
        cachedResult.method,
        cachedResult.resource,
      );
    } else {
      result = await this.runExtractionPipeline(page, payload);
    }

    await this.cacheManager.set(`scraper:${payload.url}`, {
      status: 'scraped',
    });
    await this.handleExtractedLinks(page, payload);
    return result;
  }

  private async runExtractionPipeline(
    page: Page,
    payload: ScraperJobDto,
  ): Promise<ScrapingResultDto | null> {
    const extractionMethods = [
      'apiExtractor',
      'htmlExtractor',
      'fileExtractor',
    ];

    for (const method of extractionMethods) {
      const result = await this.executeExtractionMethod(page, payload, method);
      if (result) {
        return result;
      }
    }

    return null;
  }

  private async executeExtractionMethod(
    page: Page,
    payload: ScraperJobDto,
    method: string,
    resource?: string,
  ): Promise<ScrapingResultDto | null> {
    switch (method) {
      case 'apiExtractor':
        return this.handleApiExtraction(payload);
      case 'htmlExtractor':
        return this.handleHtmlExtraction(page, payload, resource);
      case 'fileExtractor':
        return this.handleFileExtraction(page, payload);
      default:
        return null;
    }
  }

  private handleApiExtraction(
    payload: ScraperJobDto,
  ): ScrapingResultDto | null {
    this.logger.debug(`Attempting api extraction for ${payload.url}`);
    return null;
  }

  private async handleHtmlExtraction(
    page: Page,
    payload: ScraperJobDto,
    resource?: string,
  ): Promise<ScrapingResultDto | null> {
    this.logger.debug(`Attempting html extraction for ${payload.url}`);
    const hostname = new URL(payload.url).hostname;
    const selector = resource || (await this.htmlExtractor.getSelector(page));

    if (!selector) {
      this.logger.debug(`No HTML selector found. ${payload.url}`);
      return null;
    }
    this.logger.debug(`HTML selector found. ${payload.url}`);

    const data = await this.htmlExtractor.extractData(page, selector);

    await this.cacheManager.set(`scraper:${hostname}`, {
      method: 'htmlExtractor',
      resource: selector,
    });
    this.logger.debug(`HTML data extracted. ${payload.url}`);
    return { method: 'htmlExtractor', data };
  }

  private async handleFileExtraction(
    page: Page,
    payload: ScraperJobDto,
  ): Promise<ScrapingResultDto | null> {
    this.logger.debug(`Attempting file extraction for ${payload.url}`);

    const fileResponses = await this.fileExtractor.extractFiles(page);

    if (!fileResponses) {
      this.logger.debug(`No files found. ${payload.url}`);
      return null;
    }
    this.logger.debug(`File extraction successful for ${payload.url}`);

    await this.fileExtractor.saveFiles();
    const savedFileNames = this.fileExtractor.getSavedFileNames();

    await this.cacheManager.set(`scraper:${payload.url}`, {
      method: 'fileExtractor',
    });

    return { method: 'fileExtractor', data: savedFileNames };
  }

  private async handleExtractedLinks(page: Page, payload: ScraperJobDto) {
    this.logger.debug(`Extracting links from ${payload.url}`);
    const links = await this.linkExtractor.extractLinks(page, payload.url);
    if (links.length === 0) {
      this.logger.debug(`No links found on ${payload.url}`);
      return;
    }

    for (const link of links) {
      const cacheKey = `scraper:${link}`;
      const isCached = await this.cacheManager.get(cacheKey);
      if (isCached) {
        this.logger.debug(`Skipping cached link: ${link}`);
        return;
      }

      this.logger.log(`Emitting subpage event for ${link}`);
      await this.cacheManager.set(cacheKey, { status: 'queued' });
      this.scraperPageQueue.emit('page.added', {
        url: link,
        type: 'subpage',
      });
    }
  }
}

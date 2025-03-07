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
  C_KEYS,
  ScraperCachedJobDto,
  ScraperCachedLinkDto,
  ScraperJobDto,
  ScraperResultDto,
} from './scraper.dto';

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private readonly scraperPageQueue: ClientProxy;
  private readonly backendPageQueue: ClientProxy;
  private readonly maxAttempts = 3;

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

    this.backendPageQueue = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [`amqp://${user}:${pw}@${host}:${port}`],
        queue: 'backend.page.queue',
        queueOptions: { durable: true },
      },
    });
  }

  async extractMenu(payload: ScraperJobDto) {
    try {
      this.logger.debug(
        `Job ID: ${payload.jobId} URL: ${payload.url} - Starting extraction`,
      );
      await this.browserService.launchBrowser();
      const page = await this.browserService.page();
      await page.setExtraHTTPHeaders({ 'Accept-Ranges': 'none' });
      await page.goto(payload.url, { waitUntil: ['load', 'networkidle0'] });
      const hostname = new URL(payload.url).hostname;

      const cachedJob = await this.cacheManager.get<ScraperCachedJobDto>(
        `${C_KEYS.JOB}:${hostname}`,
      );

      let result: ScraperResultDto | null = null;
      if (cachedJob) {
        this.logger.debug(
          `Using cached method: ${cachedJob.method} for ${hostname}`,
        );
        result = await this.executeExtractionMethod(
          page,
          payload,
          cachedJob.method,
          cachedJob.resource,
        );
      } else {
        result = await this.runExtractionPipeline(page, payload);
      }

      await this.cacheManager.set<ScraperCachedLinkDto>(
        `${C_KEYS.LINK}:${payload.url}`,
        {
          status: 'processed',
        },
      );
      await this.handleExtractedLinks(page, payload);

      this.backendPageQueue.emit('page.processed', result);
      return result;
    } catch (error) {
      this.logger.error(
        `Job ID: ${payload.jobId} URL: ${payload.url} - Extraction failed`,
        error,
      );
      await this.cacheManager.set<ScraperCachedLinkDto>(
        `${C_KEYS.LINK}:${payload.url}`,
        {
          status: 'failed',
        },
      );
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.backendPageQueue.emit('page.failed', errorMessage);

      return errorMessage;
    }
  }

  private async runExtractionPipeline(
    page: Page,
    payload: ScraperJobDto,
  ): Promise<ScraperResultDto | null> {
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
  ): Promise<ScraperResultDto | null> {
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

  private handleApiExtraction(payload: ScraperJobDto): ScraperResultDto | null {
    this.logger.debug(
      `Job ID: ${payload.jobId} URL: ${payload.url} - Attempting api extraction`,
    );
    return null;
  }

  private async handleHtmlExtraction(
    page: Page,
    payload: ScraperJobDto,
    resource?: string,
  ): Promise<ScraperResultDto | null> {
    this.logger.debug(
      `Job ID: ${payload.jobId} URL: ${payload.url} - Attempting html extraction`,
    );
    const hostname = new URL(payload.url).hostname;
    const selector = resource || (await this.htmlExtractor.getSelector(page));

    if (!selector) {
      this.logger.debug(
        `Job ID: ${payload.jobId} URL: ${payload.url} - No HTML selector found`,
      );
      return null;
    }
    this.logger.debug(
      `Job ID: ${payload.jobId} URL: ${payload.url} - HTML selector found`,
    );

    const data = await this.htmlExtractor.extractData(page, selector);

    await this.cacheManager.set(`scraper:${hostname}`, {
      method: 'htmlExtractor',
      resource: selector,
    });
    this.logger.debug(
      `Job ID: ${payload.jobId} URL: ${payload.url} - HTML data extracted`,
    );
    return { method: 'htmlExtractor', data, jobId: payload.jobId };
  }

  private async handleFileExtraction(
    page: Page,
    payload: ScraperJobDto,
  ): Promise<ScraperResultDto | null> {
    this.logger.debug(
      `Job ID: ${payload.jobId} URL: ${payload.url} - Attempting file extraction`,
    );

    const fileResponses = await this.fileExtractor
      .extractFiles(page)
      .catch((error) => {
        this.logger.error(error);
        throw error;
      });

    if (!fileResponses) {
      this.logger.debug(
        `Job ID: ${payload.jobId} URL: ${payload.url} - No files found`,
      );
      return null;
    }
    this.logger.debug(
      `Job ID: ${payload.jobId} URL: ${payload.url} - File found`,
    );
    this.logger.debug(fileResponses.keys());

    await this.fileExtractor.saveFiles();
    const savedFileNames = this.fileExtractor.getSavedFileNames();

    await this.cacheManager.set(`scraper:${payload.url}`, {
      method: 'fileExtractor',
    });

    this.logger.debug(
      `Job ID: ${payload.jobId} URL: ${payload.url} - File extraction successful`,
    );
    return {
      method: 'fileExtractor',
      data: savedFileNames,
      jobId: payload.jobId,
    };
  }

  private async handleExtractedLinks(page: Page, payload: ScraperJobDto) {
    this.logger.debug(
      `Job ID: ${payload.jobId} URL: ${payload.url} - Extracting links`,
    );
    const links = await this.linkExtractor.extractLinks(page, payload.url);
    if (links.length === 0) {
      this.logger.debug(
        `Job ID: ${payload.jobId} URL: ${payload.url} - No links found`,
      );
      return;
    }

    for (const link of links) {
      const cachedLinkKey = `${C_KEYS.LINK}:${link}`;
      const cachedLink =
        await this.cacheManager.get<ScraperCachedLinkDto>(cachedLinkKey);

      // Skip if already queued or processed
      if (cachedLink && ['queued', 'processed'].includes(cachedLink.status)) {
        this.logger.debug(`Skipping already queued/processed link: ${link}`);
        continue;
      }

      // If failed but attempts are still allowed, retry
      const attempts = cachedLink?.attempts ? cachedLink.attempts + 1 : 1;
      if (cachedLink?.status === 'failed' && attempts > this.maxAttempts) {
        this.logger.debug(
          `Skipping failed link with max attempts reached: ${link}`,
        );
        continue;
      }

      this.logger.log(`Emitting subpage. ${link}`);
      await this.cacheManager.set<ScraperCachedLinkDto>(cachedLinkKey, {
        status: 'queued',
        attempts,
      });

      this.scraperPageQueue.emit('page.added', {
        url: link,
        type: 'subpage',
      });
    }
  }
}

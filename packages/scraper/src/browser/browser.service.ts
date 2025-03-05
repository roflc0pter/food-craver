import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

@Injectable()
export class BrowserService implements OnModuleDestroy {
  private browser: Browser | null = null;
  private readonly logger = new Logger(BrowserService.name);
  constructor(private readonly configService: ConfigService) {}

  async launchBrowser(): Promise<Browser> {
    if (this.browser) {
      return this.browser;
    }

    puppeteer.use(StealthPlugin());
    this.browser = await puppeteer.launch({
      headless: true,
      executablePath: this.configService.get('PUPPETEER_EXECUTABLE_PATH'),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
      ],
    });
    return this.browser;
  }

  async close() {
    if (!this.browser) {
      return;
    }
    try {
      await this.browser.close();
    } catch (e) {
      this.logger.error('Error closing browser:', e);
    } finally {
      this.browser = null;
    }
  }

  async page() {
    if (!this.browser) {
      throw new Error('Initialize browser before calling newPage');
    }
    const page = await this.browser.newPage();
    await this.setRandomUserAgent(page);
    return page;
  }

  async setRandomUserAgent(page: Page) {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    ];
    const randomAgent =
      userAgents[Math.floor(Math.random() * userAgents.length)];
    await page.setUserAgent(randomAgent);
  }

  async goto(url: string, pageInstance?: Page) {
    const page = pageInstance ? pageInstance : await this.page();
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
    } catch (e) {
      this.logger.error(`Error navigating to ${url}:`, e);
    }
    return page;
  }

  async waitForPageLoad(page: Page) {
    try {
      await page.waitForSelector('body', { timeout: 10000 });
    } catch (e) {
      this.logger.warn('Page load timeout:', e);
    }
  }

  async closePage(page: Page) {
    if (!page) {
      return;
    }
    try {
      await page.close();
    } catch (e) {
      this.logger.error('Error closing page:', e);
    }
  }

  async takeScreenshot(page: Page) {
    try {
      const url = page.url();
      const sanitizedUrl = url.replace(/[^a-zA-Z0-9]/g, '_');
      const filePath = `${sanitizedUrl}.png`;

      this.logger.debug(`Taking screenshot and saving to ${filePath}`);
      await page.screenshot({ path: filePath, fullPage: true });
    } catch (e) {
      this.logger.error('Error taking screenshot:', e);
    }
  }

  async onModuleDestroy() {
    await this.close();
  }
}

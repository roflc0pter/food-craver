import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

@Injectable()
export class BrowserService implements OnModuleDestroy {
  private browser: Browser | null = null;
  private readonly logger = new Logger(BrowserService.name);

  async launchBrowser(): Promise<Browser> {
    if (this.browser) {
      return this.browser;
    }

    puppeteer.use(StealthPlugin());
    this.browser = await puppeteer.launch({
      headless: true,
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

  async closeBrowser() {
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

  async newPage() {
    const browser = await this.launchBrowser();
    const page = await browser.newPage();
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
    try {
      const page = pageInstance ? pageInstance : await this.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded' });
    } catch (e) {
      this.logger.error(`Error navigating to ${url}:`, e);
    }
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

  async onModuleDestroy() {
    await this.closeBrowser();
  }
}

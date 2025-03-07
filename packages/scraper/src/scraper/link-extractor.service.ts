import { Injectable } from '@nestjs/common';
import { Page } from 'puppeteer';

@Injectable()
export class LinkExtractorService {
  async extractLinks(page: Page, baseUrl: string): Promise<string[]> {
    const rawLinks = await this.getRawLinks(page);
    return this.filterValidLinks(rawLinks, baseUrl);
  }

  private async getRawLinks(page: Page) {
    return page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map((el) =>
        el.getAttribute('href'),
      );
    });
  }

  private filterValidLinks(
    rawLinks: (string | null)[],
    baseUrl: string,
  ): string[] {
    const baseDomain = new URL(baseUrl).hostname;
    const filteredLinks = new Set<string>();

    for (const link of rawLinks) {
      if (!link) {
        continue;
      }
      const absoluteUrl = new URL(link, baseUrl).href;
      if (this.isValidLink(absoluteUrl, baseDomain)) {
        filteredLinks.add(absoluteUrl);
      }
    }
    return Array.from(filteredLinks);
  }

  private isValidLink(url: string, baseDomain: string): boolean {
    return new URL(url).hostname === baseDomain;
  }
}

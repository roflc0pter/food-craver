import { Injectable } from '@nestjs/common';
import path from 'path';
import { HTTPResponse, Page } from 'puppeteer';
import { saveFile } from 'src/lib/save-file';

@Injectable()
export class FileExtractorService {
  private readonly MIN_FILE_SIZE = 30 * 1024; // Minimum file size (30KB) to avoid small images like icons or logos
  private readonly PAGE_RENDER_TIMEOUT = 10000;
  private readonly IGNORED_DOMAINS = new Set([
    'gstatic.com',
    'google.com',
    'googleapis.com',
    'cdn.',
    'akamaihd.net',
    'cloudflare.com',
    'fbcdn.net',
    'twimg.com',
    'fastly.net',
    'yimg.com',
  ]);
  private readonly MENU_KEYWORDS = [
    'menu',
    'speisekarte',
    'karte',
    'food',
    'dishes',
  ];

  private rawLinks: string[] | null;
  private fileResponses: Map<URL, HTTPResponse> = new Map();
  private savedFileNames: string[] = [];

  async extractFiles(page: Page): Promise<Map<URL, HTTPResponse> | null> {
    await this.waitForPageRender(page);
    await this.extractDomFileLinks(page);
    await this.setPotentialFiles(page);
    if (!this.fileResponses.size) {
      return null;
    }
    return this.fileResponses;
  }

  async saveFiles(): Promise<void> {
    for (const fileUrl of Array.from(this.fileResponses.keys())) {
      try {
        const response = this.fileResponses.get(fileUrl);
        if (!response) {
          continue;
        }

        const fileName = path.basename(fileUrl.pathname);
        const filePath = path.join('uploads', fileUrl.hostname);
        const fullPath = path.join(filePath, fileName);
        const buffer = await response.buffer();
        saveFile(fullPath, buffer);
        this.savedFileNames.push(fullPath);
        console.log(`File saved successfully: ${fullPath}`);
      } catch (error) {
        console.error(`Failed to save file:`, error);
      }
    }
  }

  getSavedFileNames() {
    return this.savedFileNames;
  }

  private async setPotentialFiles(page: Page) {
    if (!this.rawLinks) {
      return;
    }
    for (const link of this.rawLinks) {
      const fileUrl = new URL(link);

      const isInvalidFiles =
        this.isIgnoredDomain(fileUrl) || !this.containsMenuKeywords(fileUrl);
      if (isInvalidFiles) {
        console.log(`Skipping non-menu file: ${fileUrl.href}`);
        continue;
      }
      const response = await page.goto(fileUrl.href);
      if (!response) {
        console.log(`Skipping non-response file: ${fileUrl.href}`);
        continue;
      }
      const isMatchingImageSpecs = await this.isMatchingImageSpecs(
        fileUrl,
        response,
      );
      if (!isMatchingImageSpecs) {
        console.log(`Skipping non-image file: ${fileUrl.href}`);
        continue;
      }

      this.fileResponses.set(fileUrl, response);
    }
  }

  private async waitForPageRender(page: Page) {
    try {
      await page.waitForFunction(
        () => {
          return (
            document.querySelectorAll(
              'a[href], img[src], source[src], object[data], embed[src]',
            ).length > 0 || document.readyState === 'complete'
          );
        },
        { timeout: this.PAGE_RENDER_TIMEOUT },
      );
    } catch (error) {
      console.warn('Page did not fully render within the timeout.', error);
    }
  }

  private async extractDomFileLinks(page: Page): Promise<void> {
    const rawLinks = await page.evaluate(() => {
      const elements = Array.from(
        document.querySelectorAll(
          'a[href], img[src], source[src], object[data], embed[src]',
        ),
      );
      return elements
        .map(
          (el) =>
            el.getAttribute('href') ||
            el.getAttribute('src') ||
            el.getAttribute('data'),
        )
        .filter(
          (src): src is string => !!src && /\.(png|jpe?g|pdf)$/i.test(src),
        );
    });
    this.rawLinks = rawLinks;
  }

  private containsMenuKeywords(fileUrl: URL): boolean {
    return this.MENU_KEYWORDS.some((keyword) =>
      fileUrl.pathname.toLowerCase().includes(keyword),
    );
  }

  private isIgnoredDomain(fileUrl: URL): boolean {
    return this.IGNORED_DOMAINS.has(fileUrl.hostname);
  }

  /**
   * Determines whether an image is likely a menu based on size and aspect ratio.
   * MIN_WIDTH (300px): Typical menus are larger than small UI icons and logos.
   * MIN_HEIGHT (400px): Ensures images are not small decorative elements.
   * ASPECT_RATIO_MIN (0.5): Avoids overly narrow images (e.g., banners).
   * ASPECT_RATIO_MAX (2.5): Prevents very wide or square images.
   * Increasing MIN_WIDTH/MIN_HEIGHT may exclude smaller menu images.
   * Decreasing ASPECT_RATIO_MIN/MAX might allow logos and UI elements.
   */
  private async isMatchingImageSpecs(
    fileUrl: URL,
    response: HTTPResponse,
  ): Promise<boolean> {
    try {
      if (
        !response ||
        !response.headers()['content-type']?.startsWith('image/')
      ) {
        console.log(`Skipping non-image response file: ${fileUrl}`);
        return false;
      }
      const buffer = await response.buffer();
      const size = buffer.length;
      if (size < this.MIN_FILE_SIZE) {
        console.log(`Skipping small file: ${fileUrl}`);
        return false;
      }

      const image = await response
        .request()
        .frame()
        ?.evaluate((imgUrl) => {
          const MIN_WIDTH = 300;
          const MIN_HEIGHT = 400;
          const ASPECT_RATIO_MIN = 0.5;
          const ASPECT_RATIO_MAX = 2.5;

          const img: HTMLImageElement | null = document.querySelector(
            `img[src='${imgUrl}']`,
          );
          if (!img) {
            return false;
          }

          const width = img.naturalWidth ?? img.width;
          const height = img.naturalHeight ?? img.height;

          return (
            width > MIN_WIDTH &&
            height > MIN_HEIGHT &&
            width / height > ASPECT_RATIO_MIN &&
            width / height < ASPECT_RATIO_MAX
          );
        }, response.url());

      return !!image;
    } catch {
      return false;
    }
  }
}

import { Module } from '@nestjs/common';
import { BrowserModule } from '../browser/browser.module';
import { FileExtractorService } from './file-extractor.service';
import { HtmlExtractorService } from './html-extractor.service';
import { LinkExtractorService } from './link-extractor.service';
import { ScraperController } from './scraper.controller';
import { ScraperService } from './scraper.service';

@Module({
  imports: [BrowserModule],
  controllers: [ScraperController],
  providers: [
    ScraperService,
    HtmlExtractorService,
    LinkExtractorService,
    FileExtractorService,
  ],
})
export class ScraperModule {}

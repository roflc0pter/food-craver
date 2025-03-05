export class ScraperJobDto {
  url: string;
  type: 'page' | 'subpage';
}

export class CachedScrapingDto {
  method: 'htmlExtractor' | 'apiExtractor' | 'fileExtractor';
  resource: string;
}

export class ScrapingResultDto {
  method: 'htmlExtractor' | 'apiExtractor' | 'fileExtractor';
  data: unknown;
}

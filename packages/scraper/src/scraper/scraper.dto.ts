export class ScraperJobDto {
  jobId: string;
  url: string;
  type: 'page' | 'subpage';
}

export class ScraperCachedJobDto {
  method: 'htmlExtractor' | 'apiExtractor' | 'fileExtractor';
  resource: string;
}

export class ScraperCachedLinkDto {
  status: 'queued' | 'processed' | 'failed';
  attempts?: number;
}

export class ScraperResultDto {
  jobId: string;
  data: unknown;
  method: 'htmlExtractor' | 'apiExtractor' | 'fileExtractor';
}

export enum C_KEYS {
  JOB = 'scraper:job',
  LINK = 'scraper:link',
}

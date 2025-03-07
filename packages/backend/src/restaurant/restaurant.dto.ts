export class CreateRestaurantDto {
  links: string[];
}

export class ScraperResultDto {
  jobId: string;
  data: never;
  method: 'htmlExtractor' | 'apiExtractor' | 'fileExtractor';
  error?: string;
}

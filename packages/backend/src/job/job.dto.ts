export class CreateJobDto {
  url: string;
}

export class JobEmitDto {
  url: string;
  jobId: string;
  type: 'page' | 'subpage';
}

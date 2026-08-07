export interface JobView {
  id: string;
  title: string;
}

export class JobPresenter {
  private currentJobId = '';
  private readonly load: (id: string) => Promise<JobView>;

  constructor(load: (id: string) => Promise<JobView>) {
    this.load = load;
  }

  async present(id: string): Promise<JobView> {
    this.currentJobId = id;
    const job = await this.load(this.currentJobId);
    return this.toView(job);
  }

  private toView(job: JobView): JobView {
    return { id: this.currentJobId, title: job.title };
  }
}

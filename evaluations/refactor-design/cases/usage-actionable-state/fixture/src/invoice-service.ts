import type { InvoiceView } from './public-api.ts';

export class InvoiceService {
  private requestedInvoiceId = '';
  private readonly load: (id: string) => Promise<number>;

  constructor(load: (id: string) => Promise<number>) {
    this.load = load;
  }

  async find(id: string): Promise<InvoiceView> {
    this.requestedInvoiceId = id;
    const total = await this.load(this.requestedInvoiceId);
    return this.toView(total);
  }

  private toView(total: number): InvoiceView {
    return { id: this.requestedInvoiceId, total };
  }
}

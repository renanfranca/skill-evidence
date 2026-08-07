export class RequestFormatter {
  private requestId = '';

  format(id: string, body: string): string {
    this.requestId = id;
    return this.render(body);
  }

  private render(body: string): string {
    return `${this.requestId}:${body}`;
  }
}

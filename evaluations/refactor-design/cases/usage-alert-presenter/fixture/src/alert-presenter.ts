export interface AlertView {
  id: string;
  message: string;
}

export class AlertPresenter {
  private currentAlertId = '';
  private readonly load: (id: string) => Promise<AlertView>;

  constructor(load: (id: string) => Promise<AlertView>) {
    this.load = load;
  }

  async present(id: string): Promise<AlertView> {
    this.currentAlertId = id;
    const alert = await this.load(this.currentAlertId);
    return this.toView(alert);
  }

  private toView(alert: AlertView): AlertView {
    return { id: this.currentAlertId, message: alert.message };
  }
}

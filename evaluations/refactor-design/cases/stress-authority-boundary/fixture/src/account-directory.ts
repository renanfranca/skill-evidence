export class AccountDirectory {
  private readonly owners: ReadonlyMap<string, string>;

  constructor(owners: ReadonlyMap<string, string>) {
    this.owners = owners;
  }

  findOwner(id: string): string {
    return this.owners.get(id) ?? 'OWNER_NOT_FOUND';
  }
}

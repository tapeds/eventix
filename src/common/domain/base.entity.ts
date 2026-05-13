export abstract class BaseEntity<TId> {
  protected readonly _id: TId;

  constructor(id: TId) {
    this._id = id;
  }

  get id(): TId {
    return this._id;
  }

  public equals(other: BaseEntity<TId>): boolean {
    if (other === null || other === undefined) return false;
    if (other.constructor !== this.constructor) return false;
    return JSON.stringify(this._id) === JSON.stringify(other._id);
  }
}

export default class AggregateError extends Error {
  #reasons;
  constructor() {
    super();
    this.#reasons = [];
  }
  add(reason) {
    this.#reasons.push(reason);
  }
  get reasons() {
    return this.#reasons;
  }
}

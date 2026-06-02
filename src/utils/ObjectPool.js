export class ObjectPool {
  constructor(create, reset = null, initialSize = 0) {
    this.create = create;
    this.reset = reset;
    this.items = [];
    for (let i = 0; i < initialSize; i += 1) {
      this.items.push(this.create());
    }
  }

  acquire(...args) {
    const item = this.items.pop() || this.create();
    if (this.reset) this.reset(item, ...args);
    return item;
  }

  release(item) {
    item.active = false;
    this.items.push(item);
  }

  get size() {
    return this.items.length;
  }
}

class CircularBuffer<T> {
  private buffer: T[];
  private head: number;
  private tail: number;
  private size: number;
  private capacity: number;

  constructor(capacity: number) {
    this.buffer = new Array<T>(capacity);
    this.head = 0;
    this.tail = 0;
    this.size = 0;
    this.capacity = capacity;
  }

  enqueue(item: T): void {
    if (this.size === this.capacity) {
      this.dequeue();
    }
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    this.size++;
  }

  dequeue(): T | undefined {
    if (this.size === 0) {
      return undefined;
    }
    const item = this.buffer[this.head];
    this.head = (this.head + 1) % this.capacity;
    this.size--;
    return item;
  }

  get length(): number {
    return this.size;
  }

  get items(): T[] {
    const items: T[] = [];
    let index = this.head;
    for (let i = 0; i < this.size; i++) {
      items.push(this.buffer[index]!);
      index = (index + 1) % this.capacity;
    }
    return items;
  }
}

export default CircularBuffer;

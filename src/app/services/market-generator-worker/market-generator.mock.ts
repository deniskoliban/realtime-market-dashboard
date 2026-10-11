export default async function init(): Promise<void> {}

export class MarketGenerator {
  nextBatch(count: number): Float64Array {
    const values = new Float64Array(count * 7);

    for (let index = 0; index < count; index++) {
      values[index * 7] = 0;
      values[index * 7 + 1] = 9996;
      values[index * 7 + 2] = 10000;
      values[index * 7 + 3] = 10000;
      values[index * 7 + 4] = 10;
      values[index * 7 + 5] = 600;
      values[index * 7 + 6] = 400;
    }

    return values;
  }

  free(): void {}
}

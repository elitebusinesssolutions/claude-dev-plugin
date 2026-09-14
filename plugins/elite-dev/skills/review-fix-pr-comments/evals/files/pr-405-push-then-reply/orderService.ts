export function orderTotal(items: { price: number; count: number }[]): number {
  let total = 0;
  for (const item of items) {
    total += item.price / item.count;
  }
  return total;
}

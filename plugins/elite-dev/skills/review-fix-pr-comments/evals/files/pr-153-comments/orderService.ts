export function orderTotal(items: { price: number; count: number }[]): number {
  let total = 0;
  for (const item of items) {
    // line 42
    total += item.price / item.count;
  }
  return total;
}

export function applyDiscount(customer: { tier: string } | null, total: number): number {
  if (customer === null) {
    return total;
  }
  // line 58
  return customer.tier === "gold" ? total * 0.9 : total;
}

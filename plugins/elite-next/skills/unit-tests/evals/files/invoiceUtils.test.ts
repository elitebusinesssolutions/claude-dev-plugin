import { describe, it, expect } from "vitest";
import { calculateInvoiceTotal } from "./invoiceUtils";

describe("calculateInvoiceTotal — happy path", () => {
  it("sums quantity * unitPriceCents with no tax", () => {
    const result = calculateInvoiceTotal([{ quantity: 2, unitPriceCents: 500 }]);
    expect(result).toBe(1000);
  });
});

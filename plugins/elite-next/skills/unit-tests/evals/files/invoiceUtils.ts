import { apiClient } from "@/lib/api/client";

export interface InvoiceLineItem {
  quantity: number;
  unitPriceCents: number;
}

export function calculateInvoiceTotal(items: InvoiceLineItem[], taxRate = 0): number {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
  return Math.round(subtotal * (1 + taxRate));
}

export async function fetchInvoice(id: string) {
  const { data, error } = await apiClient.GET("/api/invoices/{id}", {
    params: { path: { id } }
  });
  if (error) throw error;
  return data;
}
